import { generateObject } from "ai";
import { AIAnalysisError } from "./errors";
import { productAnalysisSchema, type ProductAnalysis } from "./schemas";

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function analyzeProductImage(
  image: string,
  conversationMessages?: ConversationMessage[],
  userContext?: string
): Promise<ProductAnalysis> {
  try {
    // Build cumulative context from conversation history
    let contextPrompt = "";
    if (conversationMessages && conversationMessages.length > 0) {
      const userInputs = conversationMessages
        .filter(
          (msg) =>
            msg.role === "user" && msg.content && msg.content.trim() !== ""
        )
        .map((msg) => msg.content);

      if (userInputs.length > 0) {
        contextPrompt =
          "\n\nUser's refinement requests (apply all cumulatively):\n" +
          userInputs.map((input: string) => `- "${input}"`).join("\n");
      }
    }

    const allUserInputs = contextPrompt ? contextPrompt : "";
    const currentInput = userContext
      ? `\n\nNew refinement: "${userContext}"`
      : "";

    const promptText = `Analyze this product image in detail and identify ALL visible clothing items and products separately.${allUserInputs}${currentInput}

CRITICAL: User refinements OVERRIDE visual detection and are CUMULATIVE:

1. USER-SPECIFIED ATTRIBUTES OVERRIDE VISUAL DETECTION:
   - If the user specifies a color (e.g., "everything red", "blue only", "show me green"), set that color for ALL items, regardless of what you see in the image
   - If the user specifies a brand, gender, subcategory, or other attribute, use that instead of what you detect
   - Visual detection is only used when the user hasn't specified that attribute
   
2. REFINEMENTS ARE CUMULATIVE (all apply together):
   - Example: User says "blue only" → all items get color: Blue
   - Then user says "under 50 pounds" → all items KEEP color: Blue AND add maxPrice: 50
   - Each new refinement adds to or overrides previous ones, never removes them

3. USER REFINEMENT EXAMPLES:
   - "everything red" → set color: "Red" for ALL items
   - "mens only" → set gender: "Mens" for ALL items  
   - "Nike shoes" → set brand: "Nike" AND subcategory to appropriate shoe type
   - "blue jeans under 50 pounds" → set color: "Blue", subcategory: appropriate jeans type, maxPrice: 50, currency: "GBP"

ANALYSIS PROCESS (follow this order):

1. CHECK USER REFINEMENTS FIRST:
   - Before analyzing the image, check if the user has specified any attributes (color, gender, brand, subcategory, price, etc.)
   - These user specifications ALWAYS override what you see in the image
   - Apply user-specified attributes to ALL items

2. DETECT GENDER/DEMOGRAPHIC:
   - If the user specified gender, use that for ALL items
   - Otherwise, analyze the image to determine the intended gender/demographic (Mens, Womens, Unisex Adults, Boys, Girls, Unisex Kids)
   - Look at styling, fit, cut, and presentation to determine gender targeting

3. ANALYZE EACH ITEM'S ATTRIBUTES:
   For each item you detect:
   - Identify the specific product type (e.g., t-shirt, jeans, sneakers, jacket)
   - For color: Use user-specified color if provided, otherwise detect the primary color and any secondary colors
   - For brand: Use user-specified brand if provided, otherwise identify any visible brand names or logos  
   - For subcategory: Use user-specified type if provided, otherwise identify the category and subcategory
   - Describe the style, fit, material, and pattern (unless user specified these)
   - Mark the most prominent item as "primary" and others as "secondary"

4. PRICE CONSTRAINTS (if applicable):
   If the user mentions price constraints (e.g., "under 50 pounds", "below 100 euros", "less than $75"), extract for EACH applicable item:
   - maxPrice: the maximum price value as a number
   - minPrice: the minimum price value as a number (if they say "over X" or "above X")
   - currency: the currency code (GBP for pounds, EUR for euros, USD for dollars)

   Example: "under 50 pounds" → maxPrice: 50, currency: "GBP"
   Example: "between 20 and 50 euros" → minPrice: 20, maxPrice: 50, currency: "EUR"

5. IMAGE CONTEXT (for search optimization):
   Provide a brief, unique description capturing visual elements NOT already covered by the item attributes above. Focus on:
   - Setting/environment (studio, outdoor, lifestyle shot, etc.)
   - Composition/styling (layered look, color coordination, seasonal styling, etc.)
   - Context clues (occasion, activity, mood, lighting)
   - Any distinctive visual features that would help with search but aren't in the item fields
   
   Keep it concise (1-2 sentences max) and search-friendly. Avoid repeating information already captured in item attributes.

FINAL REMINDERS:
- Detect every visible clothing item or product in the image (shirt, pants, shoes, jacket, etc. as separate items)
- User refinements are SEARCH FILTERS - they override visual detection and apply to ALL items
- If user says "everything red", ALL items must have color: "Red" even if they look different in the image
- If user says "mens only", ALL items must have gender: "Mens" even if they look different in the image
- Focus on attributes that will help find similar products in search results`;

    console.log(`[AI Service] Sending prompt with context`);

    const result = await generateObject({
      model: "anthropic/claude-sonnet-4.5",
      schema: productAnalysisSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: promptText,
            },
            {
              type: "image",
              image,
            },
          ],
        },
      ],
    });

    console.log("[AI Service] Analysis result:", JSON.stringify(result.object));
    return result.object;
  } catch (error) {
    console.error("[AI Service] Analysis failed:", error);
    throw new AIAnalysisError("Failed to analyze product image", error);
  }
}

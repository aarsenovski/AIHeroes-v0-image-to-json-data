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

IMPORTANT: The user inputs above are CUMULATIVE refinements to the search. Each new input adds constraints without removing previous ones. For example:
- If the user said "blue only", then later "price below 50 pounds", you should maintain BOTH constraints (blue color AND price limit).
- Apply ALL user refinements together when determining the product attributes for each item.

For each item you detect:
- Identify the specific product type (e.g., t-shirt, jeans, sneakers, jacket)
- Determine the primary color and any secondary colors
- Identify the category and subcategory
- Detect the gender/demographic if discernible
- Identify any visible brand names or logos
- Describe the style, fit, material, and pattern
- Mark the most prominent item as "primary" and others as "secondary"

If the user mentions price constraints (e.g., "under 50 pounds", "below 100 euros", "less than $75"), extract for EACH applicable item:
- maxPrice: the maximum price value as a number
- minPrice: the minimum price value as a number (if they say "over X" or "above X")
- currency: the currency code (GBP for pounds, EUR for euros, USD for dollars)

Example: "under 50 pounds" → maxPrice: 50, currency: "GBP"
Example: "between 20 and 50 euros" → minPrice: 20, maxPrice: 50, currency: "EUR"

Be thorough and detect every visible clothing item or product in the image. If someone is wearing multiple items (e.g., shirt, pants, shoes, jacket), detect each one separately. Focus on visual details that would help someone search for similar products.`;

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

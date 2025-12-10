import { generateObject } from "ai";
import { AIAnalysisError } from "./errors";
import { productAnalysisSchema, type ProductAnalysis } from "./schemas";

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function analyzeProductImage(
  image: string,
  conversationMessages?: ConversationMessage[]
): Promise<ProductAnalysis> {
  try {
    const messages = [
      ...(conversationMessages || []).map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: `Analyze this product image in detail and identify ALL visible clothing items and products separately. 

For each item you detect:
- Identify the specific product type (e.g., t-shirt, jeans, sneakers, jacket)
- Determine the primary color and any secondary colors
- Identify the category and subcategory
- Detect the gender/demographic if discernible
- Identify any visible brand names or logos
- Describe the style, fit, material, and pattern
- Mark the most prominent item as "primary" and others as "secondary"

Be thorough and detect every visible clothing item or product in the image. If someone is wearing multiple items (e.g., shirt, pants, shoes, jacket), detect each one separately. Focus on visual details that would help someone search for similar products.`,
          },
          {
            type: "image" as const,
            image,
          },
        ],
      },
    ];

    const result = await generateObject({
      model: "anthropic/claude-sonnet-4.5",
      schema: productAnalysisSchema,
      messages,
    });

    return result.object;
  } catch (error) {
    console.error("[AI Service] Analysis failed:", error);
    throw new AIAnalysisError("Failed to analyze product image", error);
  }
}

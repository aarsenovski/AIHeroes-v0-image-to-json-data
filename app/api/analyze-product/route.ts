import { generateObject } from "ai"
import { z } from "zod"

const productSchema = z.object({
  productType: z
    .string()
    .describe("The type of product in the image (e.g., t-shirt, trousers, dress, shoes, jacket, sweater, etc.)"),
  color: z.string().describe("The primary color of the product (e.g., red, blue, black, white, navy, etc.)"),
  confidence: z.number().min(0).max(1).optional().describe("Confidence score of the analysis (0-1)"),
})

export async function POST(req: Request) {
  try {
    const { image } = await req.json()

    if (!image) {
      return Response.json({ error: "No image provided" }, { status: 400 })
    }

    // Use AI SDK to analyze the image
    const result = await generateObject({
      model: "anthropic/claude-sonnet-4.5",
      schema: productSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this product image and identify the product type and primary color. Be specific and accurate.",
            },
            {
              type: "image",
              image,
            },
          ],
        },
      ],
    })

    return Response.json(result.object)
  } catch (error) {
    console.error("[v0] Error analyzing product:", error)
    return Response.json({ error: "Failed to analyze product" }, { status: 500 })
  }
}

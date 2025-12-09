import { algoliasearch } from "algoliasearch"
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
  console.log("[v0] API route called")

  try {
    const body = await req.json()
    const { image } = body
    console.log("[v0] Request body parsed, image length:", image?.length || 0)

    if (!image) {
      return Response.json({ error: "No image provided" }, { status: 400 })
    }

    console.log("[v0] Starting AI analysis...")

    let analysis
    try {
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
      analysis = result.object
      console.log("[v0] AI analysis result:", JSON.stringify(analysis))
    } catch (aiError) {
      console.error("[v0] AI analysis failed:", aiError)
      return Response.json({ error: "AI analysis failed", details: String(aiError) }, { status: 500 })
    }

    const searchQuery = `${analysis.color} ${analysis.productType}`
    console.log("[v0] Searching Algolia with query:", searchQuery)

    let products = []
    try {
      const appId = process.env.ALGOLIA_APP_ID
      const apiKey = process.env.ALGOLIA_API_KEY
      const environment = process.env.ALGOLIA_ENVIRONMENT || "production"

      console.log(
        "[v0] Algolia config - appId exists:",
        !!appId,
        ", apiKey exists:",
        !!apiKey,
        ", environment:",
        environment,
      )

      if (!appId || !apiKey) {
        console.error("[v0] Missing Algolia credentials")
        return Response.json({
          analysis,
          searchQuery,
          products: [],
          algoliaError: "Missing Algolia credentials - please add ALGOLIA_APP_ID and ALGOLIA_API_KEY",
        })
      }

      const algoliaClient = algoliasearch(appId, apiKey)
      const indexName = `hof_${environment}_search`
      console.log("[v0] Using index:", indexName)

      const searchResults = await algoliaClient.search({
        requests: [
          {
            indexName,
            query: searchQuery,
            hitsPerPage: 6,
            attributesToRetrieve: [
              "objectID",
              "name",
              "brand",
              "colourName",
              "prices",
              "cleansize",
              "productLink",
              "activitygroup",
              "category",
              "colourCode",
              "sleevelength",
              "garmentcare",
            ],
          },
        ],
      })

      products = searchResults.results?.[0]?.hits || []
      console.log("[v0] Algolia returned", products.length, "products")
    } catch (algoliaError) {
      console.error("[v0] Algolia search failed:", algoliaError)
      return Response.json({
        analysis,
        searchQuery,
        products: [],
        algoliaError: String(algoliaError),
      })
    }

    return Response.json({
      analysis,
      searchQuery,
      products,
    })
  } catch (error) {
    console.error("[v0] Unexpected error:", error)
    return Response.json({ error: "Failed to analyze product", details: String(error) }, { status: 500 })
  }
}

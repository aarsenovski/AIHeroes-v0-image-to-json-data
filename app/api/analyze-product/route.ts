import { generateObject } from "ai"
import { z } from "zod"
import { algoliasearch } from "algoliasearch"

const productSchema = z.object({
  productType: z
    .string()
    .describe("The type of product in the image (e.g., t-shirt, trousers, dress, shoes, jacket, sweater, etc.)"),
  color: z.string().describe("The primary color of the product (e.g., red, blue, black, white, navy, etc.)"),
  confidence: z.number().min(0).max(1).optional().describe("Confidence score of the analysis (0-1)"),
})

const getAlgoliaClient = () => {
  const appId = process.env.ALGOLIA_APP_ID
  const apiKey = process.env.ALGOLIA_API_KEY

  if (!appId || !apiKey) {
    throw new Error("Algolia credentials missing - please add ALGOLIA_APP_ID and ALGOLIA_API_KEY environment variables")
  }

  return algoliasearch(appId, apiKey)
}

const getAlgoliaIndex = () => {
  const environment = process.env.ALGOLIA_ENVIRONMENT || "production"
  return `hof_${environment}_search`
}

export async function POST(req: Request) {
  try {
    const { image } = await req.json()

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
      console.log("[v0] AI analysis result:", analysis)
    } catch (aiError) {
      console.error("[v0] AI analysis failed:", aiError)
      return Response.json({ error: "AI analysis failed", details: String(aiError) }, { status: 500 })
    }

    const searchQuery = `${analysis.color} ${analysis.productType}`
    console.log("[v0] Searching Algolia with query:", searchQuery)

    let products = []
    try {
      const algoliaClient = getAlgoliaClient()
      const index = algoliaClient.initIndex(getAlgoliaIndex())
      const searchResults = await index.search({
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
      })

      products = "hits" in searchResults ? searchResults.hits : []
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

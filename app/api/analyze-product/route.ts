import { generateObject } from "ai"
import { algoliasearch } from "algoliasearch"
import { productAnalysisSchema } from "@/lib/schemas"

export async function POST(req: Request) {
  console.log("[v0] API route called")

  console.log("testing 1234")

  try {
    const body = await req.json()
    const { image, userContext } = body
    console.log("[v0] Request body parsed, image length:", image?.length || 0)
    console.log("[v0] User context:", userContext)

    if (!image) {
      return Response.json({ error: "No image provided" }, { status: 400 })
    }

    console.log("[v0] Starting AI analysis...")

    let analysis
    try {
      const promptText = userContext
        ? `Analyze this product image in detail. The user has provided this additional context: "${userContext}". Use this context to inform your analysis. Identify the product type, category, color(s), gender/demographic, style, fit, material, pattern, and any other relevant attributes. Be specific and accurate. If you can see a brand logo or name, include it. Focus on visual details that would help someone search for similar products.`
        : "Analyze this product image in detail. Identify the product type, category, color(s), gender/demographic, style, fit, material, pattern, and any other relevant attributes. Be specific and accurate. If you can see a brand logo or name, include it. Focus on visual details that would help someone search for similar products."

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
      })
      analysis = result.object
      console.log("[v0] AI analysis result:", JSON.stringify(analysis))
    } catch (aiError) {
      console.error("[v0] AI analysis failed:", aiError)
      return Response.json({ error: "AI analysis failed", details: String(aiError) }, { status: 500 })
    }

    const searchTerms = [
      analysis.gender,
      analysis.brand,
      analysis.color,
      ...(analysis.secondaryColors || []),
      analysis.productType,
      analysis.subcategory,
      analysis.style,
      analysis.fit,
      analysis.material,
      analysis.pattern,
      analysis.sleeveLength,
    ]
      .filter(Boolean)
      .join(" ")

    const searchQuery = searchTerms || `${analysis.color} ${analysis.productType}`
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
              "colourCode",
              "alternativeImages",
              "prices",
              "ticketPrice",
              "cleansize",
              "productLink",
              "category",
              "activitygroup",
              "sleevelength",
              "garmentcare",
              "hasInventory",
              "isHidden",
              "sellingPriceGroupValue",
            ],
          },
        ],
      })

      products = searchResults.results?.[0]?.hits || []
      console.log("[v0] Algolia returned", products.length, "products")
      if (products.length > 0) {
        console.log("[v0] First product sample:", JSON.stringify(products[0], null, 2).slice(0, 500))
      }
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

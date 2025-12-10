import { generateObject } from "ai"
import { algoliasearch } from "algoliasearch"
import { productAnalysisSchema } from "@/lib/schemas"

export async function POST(req: Request) {
  console.log("[v0] API route called")

  console.log("testing 1234")

  try {
    const body = await req.json()
    const { image, userContext, conversationHistory } = body // Accept conversation history
    console.log("[v0] Request body parsed, image length:", image?.length || 0)
    console.log("[v0] User context:", userContext)
    console.log("[v0] Conversation history length:", conversationHistory?.length || 0)

    if (!image) {
      return Response.json({ error: "No image provided" }, { status: 400 })
    }

    console.log("[v0] Starting AI analysis...")

    let analysis
    try {
      let contextPrompt = ""
      if (conversationHistory && conversationHistory.length > 0) {
        const userInputs = conversationHistory
          .filter((msg: any) => msg.type === "user" && msg.content && msg.content.trim() !== "")
          .map((msg: any) => msg.content)

        if (userInputs.length > 0) {
          contextPrompt =
            "\n\nUser's refinement requests (apply all cumulatively):\n" +
            userInputs.map((input: string) => `- "${input}"`).join("\n")
        }
      }

      const allUserInputs = contextPrompt ? contextPrompt : ""
      const currentInput = userContext ? `\n\nNew refinement: "${userContext}"` : ""

      const promptText = `Analyze this product image in detail.${allUserInputs}${currentInput} 

IMPORTANT: The user inputs above are CUMULATIVE refinements to the search. Each new input adds constraints without removing previous ones. For example:
- If the user said "blue only", then later "price below 50 pounds", you should maintain BOTH constraints (blue color AND price limit).
- Apply ALL user refinements together when determining the product attributes.

Identify the product type, category, color(s), gender/demographic, style, fit, material, pattern, and any other relevant attributes. Be specific and accurate. If you can see a brand logo or name, include it. Focus on visual details that would help someone search for similar products.

If the user mentions price constraints (e.g., "under 50 pounds", "below 100 euros", "less than $75"), extract:
- maxPrice: the maximum price value as a number
- minPrice: the minimum price value as a number (if they say "over X" or "above X")
- currency: the currency code (GBP for pounds, EUR for euros, USD for dollars)

Example: "under 50 pounds" → maxPrice: 50, currency: "GBP"
Example: "between 20 and 50 euros" → minPrice: 20, maxPrice: 50, currency: "EUR"`

      console.log(`[v0] Sending prompt ${promptText}`)

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

    let priceFilter = ""
    if (analysis.maxPrice || analysis.minPrice) {
      const currency = analysis.currency || "GBP"
      const priceField = `prices.${currency}.sellingPrice`

      if (analysis.minPrice && analysis.maxPrice) {
        priceFilter = `${priceField} >= ${analysis.minPrice} AND ${priceField} <= ${analysis.maxPrice}`
      } else if (analysis.maxPrice) {
        priceFilter = `${priceField} <= ${analysis.maxPrice}`
      } else if (analysis.minPrice) {
        priceFilter = `${priceField} >= ${analysis.minPrice}`
      }

      console.log("[v0] Applying price filter:", priceFilter)
    }

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
            ...(priceFilter && { filters: priceFilter }),
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

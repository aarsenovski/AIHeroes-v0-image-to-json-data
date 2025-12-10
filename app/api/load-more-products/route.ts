import { searchAlgoliaProducts } from "@/lib/algolia-services"
import { handleApiError } from "@/lib/errors"
import { buildSearchQuery, generateCorrelationId } from "@/lib/search-helpers"

interface DetectedItem {
  productType: string
  color: string
  category: string
  subcategory?: string
  secondaryColors?: string[]
  gender?: "Mens" | "Womens" | "Unisex" | "Kids"
  brand?: string
  style?: string
  fit?: string
  material?: string
  pattern?: string
  sleeveLength?: string
  prominence?: "primary" | "secondary"
  maxPrice?: number
  minPrice?: number
  currency?: string
  confidence?: number
}

export async function POST(req: Request) {
  const correlationId = generateCorrelationId()

  try {
    const body = await req.json()
    const {
      detectedItem,
      page = 1,
      existingProductIds = [],
    } = body as {
      detectedItem: DetectedItem
      page?: number
      existingProductIds?: string[]
    }

    if (!detectedItem) {
      return Response.json({ error: "Missing detectedItem parameter" }, { status: 400 })
    }

    const searchQuery = buildSearchQuery(detectedItem)

    // Build price filter if price constraints are present
    let priceFilter = ""
    if (detectedItem.maxPrice || detectedItem.minPrice) {
      const currency = detectedItem.currency || "GBP"
      const priceField = `prices.${currency}.sellingPrice`

      if (detectedItem.minPrice && detectedItem.maxPrice) {
        priceFilter = `${priceField} >= ${detectedItem.minPrice} AND ${priceField} <= ${detectedItem.maxPrice}`
      } else if (detectedItem.maxPrice) {
        priceFilter = `${priceField} <= ${detectedItem.maxPrice}`
      } else if (detectedItem.minPrice) {
        priceFilter = `${priceField} >= ${detectedItem.minPrice}`
      }

      console.log(`[${correlationId}] Applying price filter:`, priceFilter)
    }

    // Fetch 9 more products starting from the specified page
    const products = await searchAlgoliaProducts({
      searchTerms: [searchQuery],
      hitsPerPage: 9,
      page,
      ...(priceFilter && { filters: priceFilter }),
    })

    const uniqueProducts = products.filter((product) => !existingProductIds.includes(product.objectID))

    console.log(`[${correlationId}] Loaded ${products.length} products, ${uniqueProducts.length} unique`)

    return Response.json({
      products: uniqueProducts,
      searchQuery,
      hasMore: uniqueProducts.length > 0 && products.length === 9,
      correlationId,
    })
  } catch (error) {
    return handleApiError(error, correlationId)
  }
}

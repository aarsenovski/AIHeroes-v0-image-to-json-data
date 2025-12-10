import { analyzeProductImage } from "@/lib/ai-services"
import { searchAlgoliaProducts } from "@/lib/algolia-services"
import { handleApiError } from "@/lib/errors"
import {
  buildAttributeFilters,
  buildSearchQuery,
  generateCorrelationId,
  sanitizeConversationMessages,
  validateImageInput,
} from "@/lib/search-helpers"

export async function POST(req: Request) {
  const correlationId = generateCorrelationId()

  try {
    const body = await req.json()
    const { image, messages, userContext } = body

    validateImageInput(image)
    const conversationMessages = sanitizeConversationMessages(messages)

    const analysis = await analyzeProductImage(image, conversationMessages, userContext)

    const searchResults = await Promise.all(
      analysis.items.map(async (item) => {
        const searchQuery = buildSearchQuery(item)

        // Build facet filters for categorical attributes (brand, color, subcategory)
        const facetFilters = buildAttributeFilters(item);

        // Build numeric price filter if price constraints are present
        let priceFilter: string | undefined;
        if (item.maxPrice || item.minPrice) {
          const currency = item.currency || "GBP"
          const priceField = `prices.${currency}.sellingPrice`

          if (item.minPrice && item.maxPrice) {
            priceFilter = `${priceField} >= ${item.minPrice} AND ${priceField} <= ${item.maxPrice}`
          } else if (item.maxPrice) {
            priceFilter = `${priceField} <= ${item.maxPrice}`
          } else if (item.minPrice) {
            priceFilter = `${priceField} >= ${item.minPrice}`
          }
        }

        // Log applied filters
        if (facetFilters.length > 0) {
          console.log(
            `[${correlationId}] Applying facetFilters:`,
            facetFilters
          );
        }
        if (priceFilter) {
          console.log(`[${correlationId}] Applying price filter:`, priceFilter);
        }

        try {
          const products = await searchAlgoliaProducts({
            searchTerms: [searchQuery],
            hitsPerPage: 3,
            ...(facetFilters.length > 0 && { facetFilters }),
            ...(priceFilter && { filters: priceFilter }),
          })

          return {
            detectedItem: item,
            searchQuery,
            products,
          }
        } catch (error) {
          console.error(`[${correlationId}] Search failed:`, error)

          return {
            detectedItem: item,
            searchQuery,
            products: [],
          }
        }
      }),
    )

    return Response.json({
      analysis,
      results: searchResults,
      correlationId,
    })
  } catch (error) {
    return handleApiError(error, correlationId)
  }
}

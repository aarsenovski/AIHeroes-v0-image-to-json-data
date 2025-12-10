import { algoliasearch } from "algoliasearch"
import { AlgoliaSearchError } from "./errors"
import type { AlgoliaProduct } from "./schemas"

export interface AlgoliaConfig {
  appId: string
  apiKey: string
  environment?: string
}

export interface AlgoliaSearchParams {
  searchTerms: string | string[];
  hitsPerPage?: number;
  filters?: string;
  facetFilters?: string[][];
  attributesToRetrieve?: string[];
    page?: number // Added page parameter for pagination
}

const DEFAULT_ATTRIBUTES_TO_RETRIEVE = [
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
]

export function getAlgoliaConfig(): AlgoliaConfig {
  const appId = process.env.ALGOLIA_APP_ID
  const apiKey = process.env.ALGOLIA_API_KEY
  const environment = process.env.ALGOLIA_ENVIRONMENT || "production"

  if (!appId || !apiKey) {
    throw new AlgoliaSearchError(
      "Missing Algolia credentials. Please set ALGOLIA_APP_ID and ALGOLIA_API_KEY environment variables.",
    )
  }

  return { appId, apiKey, environment }
}

export function getIndexName(environment: string): string {
  return `hof_${environment}_search`
}

export async function searchAlgoliaProducts(params: AlgoliaSearchParams): Promise<AlgoliaProduct[]> {
  try {
    const {
      searchTerms,
      hitsPerPage = 3,
      filters,
      facetFilters,
      attributesToRetrieve = DEFAULT_ATTRIBUTES_TO_RETRIEVE,
      page = 0, // Added page parameter with default value
    } = params

    const config = getAlgoliaConfig()
    const algoliaClient = algoliasearch(config.appId, config.apiKey)
    const indexName = getIndexName(config.environment || "production")

    const searchQuery = Array.isArray(searchTerms) ? searchTerms.filter(Boolean).join(" ") : searchTerms

    const searchResults = await algoliaClient.search({
      requests: [
        {
          indexName,
          query: searchQuery,
          hitsPerPage,
          page, // Added page to search request
          ...(filters && { filters }),
          ...(facetFilters && facetFilters.length > 0 && { facetFilters }),
          attributesToRetrieve,
        },
      ],
    })

    const firstResult = searchResults.results?.[0]
    return (firstResult && "hits" in firstResult ? firstResult.hits : []) as AlgoliaProduct[]
  } catch (error) {
    if (error instanceof AlgoliaSearchError) {
      throw error
    }
    throw new AlgoliaSearchError("Failed to search Algolia products", error)
  }
}

export async function searchAlgoliaProductsBatch(queries: AlgoliaSearchParams[]): Promise<AlgoliaProduct[][]> {
  return await Promise.all(queries.map((query) => searchAlgoliaProducts(query)))
}

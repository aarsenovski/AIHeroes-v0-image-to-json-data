import { analyzeProductImage } from "@/lib/ai-services";
import { searchAlgoliaProducts } from "@/lib/algolia-services";
import { handleApiError } from "@/lib/errors";
import {
  buildSearchQuery,
  generateCorrelationId,
  sanitizeConversationMessages,
  validateImageInput,
} from "@/lib/search-helpers";

export async function POST(req: Request) {
  const correlationId = generateCorrelationId();

  try {
    const body = await req.json();
    const { image, messages } = body;

    validateImageInput(image);
    const conversationMessages = sanitizeConversationMessages(messages);

    const analysis = await analyzeProductImage(image, conversationMessages);

    const searchResults = await Promise.all(
      analysis.items.map(async (item) => {
        const searchQuery = buildSearchQuery(item);

        try {
          const products = await searchAlgoliaProducts({
            searchTerms: [searchQuery],
          });

          return {
            detectedItem: item,
            searchQuery,
            products,
          };
        } catch (error) {
          console.error(`[${correlationId}] Search failed:`, error);

          return {
            detectedItem: item,
            searchQuery,
            products: [],
          };
        }
      })
    );

    return Response.json({
      analysis,
      results: searchResults,
      correlationId,
    });
  } catch (error) {
    return handleApiError(error, correlationId);
  }
}

import { z } from "zod";

export const detectedItemSchema = z.object({
  productType: z
    .string()
    .describe(
      "The specific type of product in the image (e.g., t-shirt, polo shirt, dress shirt, jeans, chinos, dress, skirt, jacket, coat, sweater, hoodie, shoes, sneakers, boots, etc.)"
    ),
  category: z
    .string()
    .describe(
      "The broad category (e.g., Clothing, Footwear, Accessories, etc.)"
    ),
  subcategory: z
    .string()
    .optional()
    .describe(
      "More specific subcategory (e.g., Regular Fit T-Shirts, Skinny Jeans, Running Shoes, etc.)"
    ),
  color: z
    .string()
    .describe(
      "The primary color of the product using common color names (e.g., red, blue, black, white, navy, grey, green, etc.)"
    ),
  secondaryColors: z
    .array(z.string())
    .optional()
    .describe(
      "Additional colors if the product has multiple colors or patterns"
    ),
  gender: z
    .enum(["Mens", "Womens", "Unisex", "Kids"])
    .optional()
    .describe("The intended gender/demographic for the product"),
  brand: z
    .string()
    .optional()
    .describe(
      "The brand name if visible in the image (e.g., Nike, Adidas, Boss, etc.)"
    ),
  style: z
    .string()
    .optional()
    .describe(
      "The style or aesthetic (e.g., casual, formal, sporty, streetwear, etc.)"
    ),
  fit: z
    .enum(["Slim Fit", "Regular Fit", "Relaxed Fit", "Oversized", "Tailored"])
    .optional()
    .describe("The fit type if discernible from the image"),
  material: z
    .string()
    .optional()
    .describe(
      "The apparent material or fabric (e.g., cotton, denim, leather, polyester, etc.)"
    ),
  pattern: z
    .string()
    .optional()
    .describe(
      "Any visible pattern (e.g., solid, striped, checked, floral, graphic print, etc.)"
    ),
  sleeveLength: z
    .enum(["Sleeveless", "Short Sleeve", "3/4 Sleeve", "Long Sleeve"])
    .optional()
    .describe("Sleeve length for tops"),
  prominence: z
    .enum(["primary", "secondary"])
    .optional()
    .describe(
      "Whether this is the main/most prominent item or a secondary item in the image"
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("Confidence score of this item's analysis (0-1)"),
});

export const productAnalysisSchema = z.object({
  items: z
    .array(detectedItemSchema)
    .min(1)
    .describe(
      "All clothing/product items detected in the image. Include ALL visible items separately."
    ),
  imageContext: z
    .string()
    .optional()
    .describe(
      "Brief description of the overall image context (e.g., 'person wearing casual outfit', 'product on white background')"
    ),
});

const localizedStringSchema = z
  .object({
    "en-GB": z.string().optional(),
  })
  .passthrough();

const localizedArraySchema = z
  .object({
    "en-GB": z.array(z.string()).optional(),
  })
  .passthrough();

const priceDetailsSchema = z.object({
  sellingPrice: z.number(),
  ticketPrice: z.number(),
  discountValue: z.number().optional(),
  discountPercentage: z.number().optional(),
  marginPercentage: z.number().optional(),
});

const pricesSchema = z
  .object({
    GBP: priceDetailsSchema.optional(),
    EUR: priceDetailsSchema.optional(),
    USD: priceDetailsSchema.optional(),
  })
  .passthrough();

export const algoliaProductSchema = z.object({
  objectID: z.string(),
  name: localizedStringSchema.optional(),
  brand: z.string().optional(),
  colourName: localizedStringSchema.optional(),
  colourCode: z.string().optional(),
  alternativeImages: z.array(z.string()).optional(),
  prices: pricesSchema.optional(),
  ticketPrice: z.number().optional(),
  cleansize: localizedArraySchema.optional(),
  productLink: z.string().optional(),
  category: localizedArraySchema.optional(),
  activitygroup: localizedArraySchema.optional(),
  sleevelength: localizedArraySchema.optional(),
  garmentcare: localizedArraySchema.optional(),
  hasInventory: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  sellingPriceGroupValue: z.string().optional(),
});

export const itemSearchResultSchema = z.object({
  detectedItem: detectedItemSchema,
  searchQuery: z.string(),
  products: z.array(algoliaProductSchema),
});

export const analyzeProductResponseSchema = z.object({
  analysis: productAnalysisSchema,
  results: z.array(itemSearchResultSchema),
  algoliaError: z.string().optional(),
});

export type DetectedItem = z.infer<typeof detectedItemSchema>;
export type ProductAnalysis = z.infer<typeof productAnalysisSchema>;
export type AlgoliaProduct = z.infer<typeof algoliaProductSchema>;
export type ItemSearchResult = z.infer<typeof itemSearchResultSchema>;
export type AnalyzeProductResponse = z.infer<
  typeof analyzeProductResponseSchema
>;

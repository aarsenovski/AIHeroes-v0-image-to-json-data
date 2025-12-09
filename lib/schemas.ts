import { z } from "zod"

export const productAnalysisSchema = z.object({
  productType: z
    .string()
    .describe("The type of product in the image (e.g., t-shirt, trousers, dress, shoes, jacket, sweater, etc.)"),
  color: z.string().describe("The primary color of the product (e.g., red, blue, black, white, navy, etc.)"),
  confidence: z.number().min(0).max(1).optional().describe("Confidence score of the analysis (0-1)"),
})

const localizedStringSchema = z
  .object({
    "en-GB": z.string().optional(),
  })
  .passthrough()

const localizedArraySchema = z
  .object({
    "en-GB": z.array(z.string()).optional(),
  })
  .passthrough()

const priceDetailsSchema = z.object({
  sellingPrice: z.number(),
  ticketPrice: z.number(),
  discountValue: z.number().optional(),
  discountPercentage: z.number().optional(),
  marginPercentage: z.number().optional(),
})

const pricesSchema = z
  .object({
    GBP: priceDetailsSchema.optional(),
    EUR: priceDetailsSchema.optional(),
    USD: priceDetailsSchema.optional(),
  })
  .passthrough()

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
})

export const analyzeProductResponseSchema = z.object({
  analysis: productAnalysisSchema,
  searchQuery: z.string(),
  products: z.array(algoliaProductSchema),
  algoliaError: z.string().optional(),
})

export type ProductAnalysis = z.infer<typeof productAnalysisSchema>
export type AlgoliaProduct = z.infer<typeof algoliaProductSchema>
export type AnalyzeProductResponse = z.infer<typeof analyzeProductResponseSchema>

import { z } from "zod";

const brands = [
  "adidas",
  "Nike",
  "Boss",
  "Under Armour",
  "Regatta",
  "Puma",
  "Lacoste",
  "Off White",
  "Hugo",
  "Polo Ralph Lauren",
  "Jack Wills",
  "Slazenger",
  "Tommy Hilfiger",
  "Barbour",
  "Missy Empire",
  "Be You",
  "Skechers",
  "Lassic",
  "Karrimor",
  "Gina Bacconi",
  "Jack and Jones",
  "Ted Baker",
  "Dare 2b",
  "Reebok",
  "Emporio Armani",
  "Levis",
  "Firetrap",
  "Everlast",
  "Barbour International",
  "Catherine Lansfield",
  "Tommy Jeans",
  "Calvin Klein Jeans",
  "Carrement Beau",
  "Threadbare",
  "Biba",
  "Lyle and Scott",
  "Boss Black",
  "DKNY",
  "Sondico",
  "Character",
  "Where’s That From",
  "CP Company",
  "Lilly and Sid",
  "Armani Exchange",
  "Brave Soul",
  "Timberland",
  "Agent Provocateur",
  "Team",
  "Kabinet UK",
  "CHANEL",
  "Speedo",
  "Lauren by Ralph Lauren",
  "Craghoppers",
  "Alan Symonds",
  "USA Pro",
  "French Connection",
  "Ganni",
  "Mac",
  "Farah",
  "AX Paris",
  "G Star",
  "Something Different",
  "Diesel",
  "Jon Richard",
  "Castore",
  "Marc Jacobs",
  "The North Face Outdoor",
  "Asics",
  "DSquared2",
  "Boss Bodywear",
  "Vero Moda",
  "Palm Angels",
  "Trespass",
  "Homemaker",
  "Calvin Klein Underwear",
  "Interiors by Premier",
  "Pretty Green",
  "LEGO",
  "Balenciaga",
  "Dune",
  "Lonsdale",
  "Umbro",
  "PS Paul Smith",
  "Homelife",
  "HEAD",
  "Original Penguin",
  "Napapijri",
  "ONeills",
  "Steve Madden",
  "Nobodys Child",
  "GFW",
  "Hush Puppies",
  "SoulCal",
  "I Saw It First",
  "Versace",
  "Streetwize",
  "YouGarden",
  "Russell Hobbs",
  "Gelert",
  "Aspire",
] as const;

const colors = [
  "Beige",
  "Black",
  "Blue",
  "Brown",
  "Green",
  "Grey",
  "Multi",
  "Orange",
  "Pink",
  "Purple",
  "Red",
  "Silver",
  "White",
  "Yellow",
  "None",
  "Clear",
  "Cream",
  "Gold",
  "Nude",
  "Neutral",
  "Metallics",
] as const;

const subcategories = [
  "Pool Shoes",
  "Softshell Jackets",
  "Wallpaper",
  "Waterproof Jackets",
  "Tracksuit Tops",
  "Back Packs",
  "Chinos",
  "Flip Flops",
  "Gilets",
  "Leggings",
  "Basketball Trainers",
  "Quilted Jackets",
  "Shoulder Bags",
  "Blazers",
  "Flat Ankle Boots",
  "Crew Sweaters",
  "OTH Hoodies",
  "Zip Hoodies",
  "Skinny Jeans",
  "Slim Jeans",
  "Straight Jeans",
  "Duvet Cover Sets",
  "Cushions",
  "Firm Ground Football Boots",
  "Overshirts",
  "Domestic Replica Shirts",
  "Tank Tops",
  "Mini Skirts",
  "Cardigans",
  "Cargo Trousers",
  "Closed Hem Fleece Jogging Bottoms",
  "Eau De Toilette",
  "Eau De Parfum",
  "Football Socks",
  "Tote Bags",
  "Baseball Caps",
  "1/4 Zip Fleece Tops",
  "Walking Trousers",
  "Short Sleeve Polos",
  "Wellingtons",
  "Full Zip Fleece Tops",
  "Clothing Sets",
  "Trainer Socks",
  "Performance Tracksuit Bottoms",
  "Astro Turf Football Boots",
  "Performance Vests",
  "Performance Jackets",
  "Short Sleeve Performance Polos",
  "Cropped T-Shirts",
  "Long Sleeve T-Shirts",
  "Beanies",
  "Swim Shorts",
  "Performance Tights",
  "Fleece Shorts",
  "Long Sleeve Performance T-Shirts",
  "Woven Shorts",
  "Short Sleeve Performance T-Shirts",
  "Performance Shorts",
  "Flat Sandals",
  "Court Trainers",
  "Runners",
  "Low Trainers",
  "Rain Jackets",
  "Mini Dresses",
  "Maxi Dresses",
  "Trunks",
  "Childrens Toys",
  "Action Figures",
  "Crew Socks",
  "Regular Fit T-Shirts",
  "Crew Neck Jumpers",
  "Analogue Quartz Watches",
  "Straight Trousers",
  "Plain Shirt - Long Sleeve",
  "Short Puffer Jackets",
  "Everyday Neutral Road Running Shoes",
  "Party Dresses",
  "Patterned Shirt - Long Sleeve",
  "Beds",
  "Oxford Shirt - Long Sleeve",
  "Oversized T-Shirts",
  "One Piece Swimsuits",
  "Knitted T-Shirts",
  "Lipstick",
  "Face Moisturisers",
  "Licensed Short Sleeve T-Shirts",
  "Pendant Necklaces",
  "Crossbody Bags",
  "Thong Briefs",
  "Stud Earrings",
  "Wrap Dresses",
  "Lego",
  "Patterned Shirt - Short Sleeve",
  "Blouses - Long Sleeve",
  "Plain Shirt - Short Sleeve",
  "A Line Dresses",
  "Side Tables",
  "Leather Belt",
  "Action / Adventure",
] as const;

const genders = [
  "Mens",
  "Womens",
  "Unisex Adults",
  "Boys",
  "Girls",
  "Unisex Kids",
] as const;

export const detectedItemSchema = z.object({
  subcategory: z
    .enum(subcategories)
    .describe(
      "The specific type of product in the image (e.g., t-shirt, polo shirt, dress shirt, jeans, chinos, dress, skirt, jacket, coat, sweater, hoodie, shoes, sneakers, boots, etc.)"
    ),
  category: z
    .string()
    .describe(
      "The broad category (e.g., Clothing, Footwear, Accessories, etc.)"
    ),
  color: z
    .enum(colors)
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
    .enum(genders)
    .optional()
    .describe("The intended gender/demographic for the product"),
  brand: z
    .enum(brands)
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
  maxPrice: z
    .number()
    .optional()
    .describe(
      "Maximum price limit if specified by user (e.g., 50 for 'under 50 pounds')"
    ),
  minPrice: z
    .number()
    .optional()
    .describe(
      "Minimum price limit if specified by user (e.g., 100 for 'over 100 pounds')"
    ),
  currency: z
    .string()
    .optional()
    .describe("Currency code for price filter (e.g., GBP, EUR, USD)"),
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
      "Brief, search-optimized description of unique visual elements not captured in item attributes. Focus on setting, styling composition, occasion context, or distinctive features (e.g., 'Studio shot with coordinated earth tones', 'Outdoor lifestyle styling for autumn', 'Layered streetwear ensemble with urban backdrop'). Keep concise (1-2 sentences max)."
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

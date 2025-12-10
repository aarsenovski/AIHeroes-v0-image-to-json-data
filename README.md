# Product Analyzer - AI-Powered Visual Product Search

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/frasers-hackathon/v0-image-to-json-data)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/hO7d1mvNmDL)

## Overview

Product Analyzer is an intelligent visual search application that leverages AI to identify products in images and find similar items from a catalog. Upload a photo of any product, and our system will analyze it to return visually and contextually similar matches from our extensive product database.

## Key Features

- **AI-Powered Image Recognition**: Automatically detects product type, color, brand, and other attributes
- **Smart Product Matching**: Returns relevant similar products using Algolia's advanced search capabilities
- **Progressive Loading**: Initial 3 results with "Show More" functionality for 9 additional products
- **Duplicate Prevention**: Intelligent filtering ensures unique product results
- **Multi-Image Carousels**: Browse through multiple product photos for each item
- **Responsive Design**: Optimized experience across desktop and mobile devices

## Technical Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **React**: 19.2 with latest canary features
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **UI Components**: Custom carousel, cards, badges, and buttons
- **State Management**: React hooks with SWR for data fetching

### Backend
- **Runtime**: Next.js API Routes (Server Actions)
- **AI Services**: OpenAI GPT-4 Vision for image analysis
- **Search Engine**: Algolia for product search and filtering
- **Image Processing**: Next.js Image optimization

### Key Technologies
- **TypeScript**: Full type safety across the application
- **Zod**: Runtime schema validation
- **Embla Carousel**: Touch-enabled product image carousels
- **Lucide Icons**: Consistent iconography

## Architecture

### Image Analysis Flow
\`\`\`
User Upload → AI Vision API → Product Detection → Algolia Search → Results Display
\`\`\`

1. **Image Upload**: User uploads product image via drag-and-drop or file picker
2. **AI Analysis**: OpenAI Vision API analyzes image and extracts:
   - Product type (e.g., "sweater", "shoes")
   - Colors (primary, secondary)
   - Brand recognition
   - Style attributes
3. **Search Query Construction**: Detected attributes are transformed into optimized search queries
4. **Algolia Search**: Queries sent to Algolia with:
   - Initial page: 3 results
   - Subsequent pages: 9 results with deduplication
5. **Results Rendering**: Products displayed with carousels, metadata, and CTA buttons

### API Endpoints

#### `POST /api/analyze-product`
Analyzes uploaded product images and returns similar products.

**Request:**
\`\`\`typescript
{
  imageUrl: string;
  analysisResult?: {
    items: DetectedItem[];
  };
}
\`\`\`

**Response:**
\`\`\`typescript
{
  items: ItemSearchResult[];
  analyzedImageUrl: string;
}
\`\`\`

#### `POST /api/load-more-products`
Loads additional products with pagination and deduplication.

**Request:**
\`\`\`typescript
{
  detectedItem: DetectedItem;
  searchQuery: string;
  page: number;
  existingProductIds: string[];
}
\`\`\`

**Response:**
\`\`\`typescript
{
  products: AlgoliaProduct[];
  hasMore: boolean;
}
\`\`\`

### Data Models

**DetectedItem**
\`\`\`typescript
{
  productType: string;
  color: string;
  prominence: "Primary" | "Secondary";
  // Additional AI-extracted attributes
}
\`\`\`

**AlgoliaProduct**
\`\`\`typescript
{
  objectID: string;
  productName: string;
  brandName: string;
  priceFormatted: string;
  nowPrice: number;
  alternativeImages: string[];
  colours: { colourName: string }[];
  sizes: string[];
  // ... and more
}
\`\`\`

## Performance Optimizations

- **Lazy Loading**: Product images loaded progressively
- **Smart Pagination**: Loads 3 items initially, 9 more on demand
- **Deduplication**: Client and server-side filtering prevents duplicate products
- **Image Optimization**: Next.js automatic image optimization for all product photos
- **Caching**: Algolia responses cached for improved performance

## Development

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Algolia account with product index
- OpenAI API key

### Environment Variables
\`\`\`env
ALGOLIA_APP_ID=your_algolia_app_id
ALGOLIA_API_KEY=your_algolia_api_key
ALGOLIA_ENVIRONMENT=your_index_name
OPENAI_API_KEY=your_openai_key
\`\`\`

### Installation
\`\`\`bash
pnpm install
pnpm dev
\`\`\`

### Build
\`\`\`bash
pnpm build
pnpm start
\`\`\`

## Deployment

Your project is live at:

**[https://vercel.com/frasers-hackathon/v0-image-to-json-data](https://vercel.com/frasers-hackathon/v0-image-to-json-data)**

This repository stays in sync with your deployed chats on [v0.app](https://v0.app). Any changes made to your deployed app are automatically pushed to this repository.

## Continue Building

Continue building your app on:

**[https://v0.app/chat/hO7d1mvNmDL](https://v0.app/chat/hO7d1mvNmDL)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Future Enhancements

- Color-based filtering for more accurate matches
- Multi-image upload support
- Price range filtering
- Brand preference settings
- Saved searches and favorites
- User authentication and history

## License

This project is part of the Frasers Hackathon initiative.

# Visual Affinity AI - Image to Product Search

An AI-powered fashion discovery application that analyzes images to detect clothing items and finds similar products from a retail catalog. Built for Fraser House of Fraser as part of the AI Heroes hackathon.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/frasers-hackathon/v0-image-to-json-data)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/hO7d1mvNmDL)

## 🎯 What It Does

This application bridges the gap between visual inspiration and product discovery:

1. **Image Upload** - Users upload photos of fashion items, outfits, or style inspiration
2. **AI Analysis** - Claude Sonnet 4.5 analyzes the image to detect:
   - Individual clothing items and products
   - Colors (primary and secondary)
   - Brands, styles, materials, patterns
   - Categories and subcategories
   - Gender/demographic targeting
3. **Intelligent Search** - Automatically searches Algolia for similar products using detected attributes
4. **Conversational Refinement** - Users can refine results with natural language:
   - "Show me everything in blue"
   - "Only items under £50"
   - "Men's clothing only"
5. **Outfit Building** - Select products from search results to build complete outfits with real-time price totaling

### Key Features

- **Multi-item Detection** - Identifies all visible clothing items separately
- **Structured Data Output** - Converts visual information into structured JSON for search
- **Price Filtering** - Natural language price constraints ("under 50 pounds", "between 20 and 100 euros")
- **Pagination** - Load more products to explore deeper into search results
- **Real-time Cart** - Track selected products and calculate total price
- **Modern UI** - Beautiful, responsive interface matching House of Fraser branding

## 🏗️ Architecture

```
┌─────────────────┐
│  User uploads   │
│     image       │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Claude Sonnet 4.5 via AI SDK   │
│  - Analyzes image                │
│  - Detects items & attributes    │
│  - Structured JSON output        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Algolia Search                  │
│  - Searches product catalog      │
│  - Applies filters (color,       │
│    brand, price, category)       │
│  - Returns matching products     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Results Display                 │
│  - Groups by detected item       │
│  - Shows product cards           │
│  - Allows selection & totaling   │
└─────────────────────────────────┘
```

## 🛠️ Technologies Used

### Frontend
- **[Next.js 16](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - UI library
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS
- **[shadcn/ui](https://ui.shadcn.com/)** - Component library (Radix UI primitives)

### AI & Search
- **[Vercel AI SDK](https://sdk.vercel.ai/)** - AI integration framework
- **[Claude Sonnet 4.5](https://www.anthropic.com/claude)** - Vision AI for image analysis
- **[Algolia](https://www.algolia.com/)** - Search API for product discovery
- **[Zod](https://zod.dev/)** - Schema validation and type inference

### UI Components
- **[Lucide React](https://lucide.dev/)** - Icon library
- **[Radix UI](https://www.radix-ui.com/)** - Accessible UI primitives
- **[Embla Carousel](https://www.embla-carousel.com/)** - Carousel component
- **[Next Themes](https://github.com/pacocoursey/next-themes)** - Theme management

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** (LTS recommended)
- **npm**, **pnpm**, or **yarn** package manager
- **Algolia Account** with product index configured
- **AI API Access** (via Vercel AI SDK or Anthropic API)

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Algolia Configuration
ALGOLIA_APP_ID=your_algolia_app_id
ALGOLIA_API_KEY=your_algolia_search_api_key
ALGOLIA_ENVIRONMENT=production

# AI Configuration (Vercel AI SDK will use default providers)
# If using Anthropic directly, add:
# ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/frasers-hackathon/v0-image-to-json-data.git
   cd v0-image-to-json-data
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Linting

```bash
npm run lint
```

## 📁 Project Structure

```
AIHeroes-v0-image-to-json-data/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── analyze-product/      # Image analysis endpoint
│   │   └── load-more-products/   # Pagination endpoint
│   ├── new-page/                 # Main application page
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page (redirects to new-page)
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── product-card.tsx          # Product display component
│   └── theme-provider.tsx        # Theme context provider
├── lib/                          # Utility libraries
│   ├── ai-services.ts            # Claude AI integration
│   ├── algolia-services.ts       # Algolia search client
│   ├── schemas.ts                # Zod schemas & types
│   ├── search-helpers.ts         # Search query builders
│   ├── errors.ts                 # Error handling
│   ├── env.ts                    # Environment validation
│   └── utils.ts                  # General utilities
├── public/                       # Static assets
├── styles/                       # Global styles
├── .env.local                    # Environment variables (not in repo)
├── components.json               # shadcn/ui config
├── next.config.mjs               # Next.js configuration
├── package.json                  # Dependencies
├── tailwind.config.ts            # Tailwind configuration
└── tsconfig.json                 # TypeScript configuration
```

## 🔧 Configuration

### Algolia Index Setup

The application expects an Algolia index named `hof_{environment}_search` with the following schema:

**Required Fields:**
- `objectID` - Unique product identifier
- `name.en-GB` - Product name
- `brand` - Brand name
- `colourName.en-GB` - Color name
- `prices.GBP.sellingPrice` - Price in GBP
- `category.en-GB` - Product categories (array)
- `alternativeImages` - Product images (array)

**Optional Fields:**
- `productLink` - Link to product page
- `cleansize.en-GB` - Available sizes
- `activitygroup.en-GB` - Activity groups

### AI Model Configuration

The application uses Claude Sonnet 4.5 via the Vercel AI SDK. To modify the model:

```typescript
// lib/ai-services.ts
const result = await generateObject({
  model: "anthropic/claude-sonnet-4.5", // Change model here
  schema: productAnalysisSchema,
  // ...
});
```

### Supported Brands & Categories

The application includes predefined schemas for:
- **100+ fashion brands** (Nike, Adidas, Boss, Ralph Lauren, etc.)
- **200+ product subcategories** (T-shirts, Jeans, Sneakers, etc.)
- **Gender targeting** (Mens, Womens, Unisex Adults, Boys, Girls, Unisex Kids)
- **20+ color options** with standardized naming

See `lib/schemas.ts` for complete lists.

## 🤖 AI Tools Used in Development

This project was created with assistance from several AI-powered development tools:

### [v0.app by Vercel](https://v0.app)
- **Primary UI Builder** - Generated initial components and layouts
- **Rapid Prototyping** - Quickly iterated on design concepts
- **Automatic Deployment** - Integrated with Vercel for continuous deployment
- Chat session: [v0.app/chat/hO7d1mvNmDL](https://v0.app/chat/hO7d1mvNmDL)

### [ChatGPT by OpenAI](https://chat.openai.com)
- **Architecture Planning** - Designed system architecture and data flows
- **Problem Solving** - Debugged complex issues and optimized algorithms
- **Documentation** - Helped structure README and code comments

### [Cursor](https://cursor.sh)
- **AI-Powered IDE** - Primary development environment
- **Code Completion** - Context-aware code suggestions
- **Refactoring** - Assisted with code organization and improvements
- **Natural Language Edits** - Made changes through conversational interface

### [GitHub Copilot in VSCode](https://github.com/features/copilot)
- **Code Suggestions** - Real-time code completion
- **Boilerplate Generation** - Quickly scaffolded repetitive code
- **Test Writing** - Assisted with test case creation

## 🎨 Design System

The application uses House of Fraser's visual identity:

- **Primary Colors** - Black, white, and neutral tones
- **Typography** - Clean, readable fonts with hierarchy
- **Components** - Accessible, responsive shadcn/ui components
- **Layout** - Mobile-first responsive design
- **Animations** - Subtle, performant transitions

## 🔐 Security & Best Practices

- ✅ **Environment Variables** - Sensitive credentials never committed to repo
- ✅ **Input Validation** - All user inputs validated with Zod schemas
- ✅ **Error Handling** - Comprehensive error handling with user-friendly messages
- ✅ **Type Safety** - Full TypeScript coverage with strict mode
- ✅ **API Rate Limiting** - Correlation IDs for request tracking
- ✅ **Secure Dependencies** - Regular updates and security audits

## 📊 API Endpoints

### `POST /api/analyze-product`

Analyzes an uploaded image and searches for matching products.

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "messages": [
    { "role": "user", "content": "Show me blue items" }
  ],
  "userContext": "Optional current refinement"
}
```

**Response:**
```json
{
  "analysis": {
    "items": [
      {
        "subcategory": "Regular Fit T-Shirts",
        "category": "Clothing",
        "color": "Blue",
        "gender": "Mens",
        "brand": "Nike",
        "style": "casual",
        "prominence": "primary"
      }
    ],
    "imageContext": "Studio shot with neutral background"
  },
  "results": [
    {
      "detectedItem": { /* ... */ },
      "searchQuery": "blue mens nike t-shirt",
      "products": [ /* Algolia results */ ]
    }
  ],
  "correlationId": "abc-123-def"
}
```

### `POST /api/load-more-products`

Fetches additional products for pagination.

**Request Body:**
```json
{
  "detectedItem": { /* ... */ },
  "page": 1,
  "existingProductIds": ["id1", "id2"]
}
```

## 🚦 Deployment

The application is deployed on Vercel:

**Production URL:** [https://vercel.com/frasers-hackathon/v0-image-to-json-data](https://vercel.com/frasers-hackathon/v0-image-to-json-data)

### Deploy Your Own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/frasers-hackathon/v0-image-to-json-data)

1. Click the deploy button above
2. Configure environment variables in Vercel dashboard
3. Deploy!

## 📝 License

This project was created for the AI Heroes hackathon. Please contact the repository owner for licensing information.

## 🤝 Contributing

This project is part of a hackathon submission. For questions or contributions, please open an issue or contact the team.

## 📧 Contact

For questions about this project, please reach out through:
- GitHub Issues
- Vercel deployment dashboard
- v0.app chat session

---

**Built with ❤️ for House of Fraser by the AI Heroes team**

*Powered by Claude Sonnet 4.5, Next.js 16, and Algolia*

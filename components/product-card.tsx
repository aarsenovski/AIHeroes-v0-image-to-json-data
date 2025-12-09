import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tag, Palette, ShoppingBag } from "lucide-react"

interface ProductPrice {
  sellingPrice: number
  ticketPrice: number
  discountPercentage: number
}

interface AlgoliaProduct {
  objectID: string
  name?: {
    "en-GB"?: string
  }
  brand?: string
  colourName?: {
    "en-GB"?: string
  }
  prices?: {
    GBP?: ProductPrice
  }
  cleansize?: {
    "en-GB"?: string[]
  }
  productLink?: string
  activitygroup?: {
    "en-GB"?: string[]
  }
  category?: {
    "en-GB"?: string[]
  }
  colourCode?: string
}

interface ProductCardProps {
  product: AlgoliaProduct
}

export function ProductCard({ product }: ProductCardProps) {
  const name = product.name?.["en-GB"] || "Unknown Product"
  const brand = product.brand || "Unknown Brand"
  const color = product.colourName?.["en-GB"] || "N/A"
  const prices = product.prices?.GBP
  const sizes = product.cleansize?.["en-GB"] || []
  const category = product.activitygroup?.["en-GB"]?.[0] || product.category?.["en-GB"]?.[0] || "Product"
  const colourCode = product.colourCode

  // Build image URL from colourCode
  const imageUrl = colourCode
    ? `https://images.flannels.com/images/products/pdp/${colourCode}_l.jpg`
    : "/diverse-products-still-life.png"

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={imageUrl || "/placeholder.svg"}
          alt={name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = "/diverse-fashion-display.png"
          }}
        />
        {prices && prices.discountPercentage > 0 && (
          <Badge className="absolute left-2 top-2 bg-destructive text-destructive-foreground">
            -{Math.round(prices.discountPercentage)}%
          </Badge>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{brand}</p>
          <h3 className="mt-1 line-clamp-2 font-semibold text-foreground">{name}</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Tag className="h-3 w-3" />
            {category}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Palette className="h-3 w-3" />
            {color}
          </Badge>
        </div>

        {sizes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sizes.slice(0, 5).map((size) => (
              <span key={size} className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {size}
              </span>
            ))}
            {sizes.length > 5 && <span className="px-2 py-0.5 text-xs text-muted-foreground">+{sizes.length - 5}</span>}
          </div>
        )}

        {prices && (
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-foreground">£{prices.sellingPrice.toFixed(2)}</span>
            {prices.ticketPrice > prices.sellingPrice && (
              <span className="text-sm text-muted-foreground line-through">£{prices.ticketPrice.toFixed(2)}</span>
            )}
          </div>
        )}

        {product.productLink && (
          <a
            href={`https://www.flannels.com/${product.productLink}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ShoppingBag className="h-4 w-4" />
            View Product
          </a>
        )}
      </div>
    </Card>
  )
}

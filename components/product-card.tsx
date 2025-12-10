import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Palette, ShoppingBag, Tag } from "lucide-react"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"

interface ProductPrice {
  sellingPrice: number
  ticketPrice: number
  discountPercentage: number
}

interface AlgoliaProduct {
  objectID: string
  alternativeImages?: string[]
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
  const colourCode = product.colourCode

  // Build image URL from colourCode
  const imageUrl = colourCode
    ? `https://images.flannels.com/images/products/pdp/${colourCode}_l.jpg`
    : "/diverse-products-still-life.png"

  const images =
    product.alternativeImages && product.alternativeImages.length > 0 ? product.alternativeImages : [imageUrl]

  const hasMultipleImages = images.length > 1

  const handleCarouselClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <a
      href={product.productLink ? `https://www.houseoffraser.co.uk/${product.productLink}` : "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <div className="overflow-hidden bg-background transition-all hover:shadow-md">
        <div className="relative aspect-square overflow-hidden bg-muted/30">
          {hasMultipleImages ? (
            <div onClick={handleCarouselClick}>
              <Carousel className="w-full">
                <CarouselContent>
                  {images.map((img, index) => (
                    <CarouselItem key={index}>
                      <img
                        src={img || "/placeholder.svg"}
                        alt={`${name} - Image ${index + 1}`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.src = "/diverse-fashion-display.png"
                        }}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2 opacity-0 transition-opacity group-hover:opacity-100" />
                <CarouselNext className="right-2 opacity-0 transition-opacity group-hover:opacity-100" />
              </Carousel>
            </div>
          ) : (
            <img
              src={images[0] || "/placeholder.svg"}
              alt={name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.src = "/diverse-fashion-display.png"
              }}
            />
          )}
          {prices && prices.discountPercentage > 0 && (
            <div className="absolute left-0 top-2 bg-destructive px-2 py-1 text-xs font-bold text-destructive-foreground">
              -{Math.round(prices.discountPercentage)}%
            </div>
          )}
        </div>
        <div className="space-y-2 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{brand}</p>
          <h3 className="line-clamp-2 text-sm font-medium text-foreground leading-tight">{name}</h3>
          
          {prices && (
            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-base font-bold text-foreground">£{prices.sellingPrice.toFixed(2)}</span>
              {prices.ticketPrice > prices.sellingPrice && (
                <span className="text-xs text-muted-foreground line-through">£{prices.ticketPrice.toFixed(2)}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </a>
  )
}

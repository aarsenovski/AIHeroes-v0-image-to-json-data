"use client"

import type React from "react"

import { ProductCard } from "@/components/product-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ImagePlus, Loader2, Search, Send, Sparkles, X } from "lucide-react"
import Image from "next/image"
import { useRef, useState } from "react"

interface DetectedItem {
  productType: string
  color: string
  category: string
  subcategory?: string
  secondaryColors?: string[]
  gender?: "Mens" | "Womens" | "Unisex" | "Kids"
  brand?: string
  style?: string
  fit?: string
  material?: string
  pattern?: string
  sleeveLength?: string
  prominence?: "primary" | "secondary"
  maxPrice?: number
  minPrice?: number
  currency?: string
  confidence?: number
}

interface ProductAnalysis {
  items: DetectedItem[]
  imageContext?: string
}

interface AlgoliaProduct {
  objectID: string
  alternativeImages?: string[]
  name?: { "en-GB"?: string }
  brand?: string
  colourName?: { "en-GB"?: string }
  prices?: {
    GBP?: {
      sellingPrice: number
      ticketPrice: number
      discountPercentage: number
    }
  }
  cleansize?: { "en-GB"?: string[] }
  productLink?: string
  activitygroup?: { "en-GB"?: string[] }
  category?: { "en-GB"?: string[] }
  colourCode?: string
}

interface ItemSearchResult {
  detectedItem: DetectedItem
  searchQuery: string
  products: AlgoliaProduct[]
  hasMore?: boolean // Added hasMore flag to track if more products available
}

interface Message {
  id: string
  type: "user" | "assistant"
  content?: string
  imageUrl?: string
  analysis?: ProductAnalysis
  results?: ItemSearchResult[]
  analyzedImageUrl?: string // Store the image that was analyzed
  timestamp: Date
}

export default function ProductAnalyzerPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (file: File) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      setSelectedImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageSelect(e.target.files[0])
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!selectedImage && !inputMessage.trim()) return

    setIsAnalyzing(true)

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage.trim() || undefined,
      imageUrl: selectedImage || undefined,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    const userContext = inputMessage.trim()
    setInputMessage("")
    const currentImage = selectedImage
    setSelectedImage(null)

    const imageToAnalyze = currentImage || messages.findLast((msg) => msg.type === "user" && msg.imageUrl)?.imageUrl

    if (!imageToAnalyze) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Please upload an image first before sending follow-up messages.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      setIsAnalyzing(false)
      return
    }

    try {
      // Build conversation messages from previous messages
      const conversationMessages = messages
        .filter((msg) => msg.type === "user" && msg.content)
        .map((msg) => ({
          role: "user" as const,
          content: msg.content || "",
        }))

      const response = await fetch("/api/analyze-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageToAnalyze,
          messages: conversationMessages,
          userContext: userContext || undefined,
        }),
      })

      let result
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        result = await response.json()
      } else {
        const text = await response.text()
        result = { error: "Server error", details: text }
      }

      if (!response.ok) {
        throw new Error(result.error || result.details || "Analysis failed")
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        analysis: result.analysis,
        results: result.results,
        analyzedImageUrl: imageToAnalyze, // Store the analyzed image
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `Sorry, there was an error analyzing the image: ${
          error instanceof Error ? error.message : String(error)
        }`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleLoadMore = async (messageId: string, itemIndex: number) => {
    const message = messages.find((m) => m.id === messageId)
    if (!message?.results?.[itemIndex]) return

    const loadingKey = `${messageId}-${itemIndex}`
    setLoadingMore((prev) => ({ ...prev, [loadingKey]: true }))

    try {
      const result = message.results[itemIndex]
      const currentPage = Math.floor(result.products.length / 9) + 1

      const response = await fetch("/api/load-more-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detectedItem: result.detectedItem,
          page: currentPage,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to load more products")
      }

      const data = await response.json()

      // Update the message with new products
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId && msg.results) {
            const updatedResults = [...msg.results]
            updatedResults[itemIndex] = {
              ...updatedResults[itemIndex],
              products: [...updatedResults[itemIndex].products, ...data.products],
              hasMore: data.hasMore,
            }
            return { ...msg, results: updatedResults }
          }
          return msg
        }),
      )
    } catch (error) {
      console.error("Error loading more products:", error)
    } finally {
      setLoadingMore((prev) => ({ ...prev, [loadingKey]: false }))
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Product Analyzer</h1>
          </div>
          <p className="text-lg text-muted-foreground">Upload product images to find similar items</p>
        </div>

        {/* Messages */}
        <div className="mb-6 space-y-6">
          {messages.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Upload an image to get started</p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
              {message.type === "user" ? (
                <div className="max-w-sm space-y-2">
                  {message.imageUrl && (
                    <Card className="overflow-hidden bg-primary/10 p-2">
                      <div className="relative h-48 w-full overflow-hidden rounded-lg">
                        <Image
                          src={message.imageUrl || "/placeholder.svg"}
                          alt="Uploaded product"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </Card>
                  )}
                  {message.content && (
                    <Card className="bg-primary p-4 text-primary-foreground">
                      <p>{message.content}</p>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="w-full space-y-4">
                  {/* Show analyzed image */}
                  {message.analyzedImageUrl && (
                    <Card className="bg-card p-4">
                      <div className="mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Analyzed Image:</span>
                      </div>
                      <div className="relative h-64 w-full max-w-md overflow-hidden rounded-lg">
                        <Image
                          src={message.analyzedImageUrl || "/placeholder.svg"}
                          alt="Analyzed product"
                          fill
                          className="object-contain"
                        />
                      </div>
                    </Card>
                  )}

                  {message.analysis && (
                    <Card className="bg-card p-6">
                      <div className="mb-4">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            Detected {message.analysis.items.length} item(s):
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {message.analysis.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Badge variant="default" className="text-sm">
                                {item.productType}
                              </Badge>
                              <Badge variant="secondary" className="text-sm">
                                {item.color}
                              </Badge>
                              {item.prominence === "primary" && (
                                <Badge variant="outline" className="text-xs">
                                  Primary
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                        {message.analysis.imageContext && (
                          <p className="mt-2 text-sm text-muted-foreground">{message.analysis.imageContext}</p>
                        )}
                      </div>

                      {/* JSON Output */}
                      <details className="group">
                        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                          View JSON Data
                        </summary>
                        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-4 text-xs">
                          <code>{JSON.stringify(message.analysis, null, 2)}</code>
                        </pre>
                      </details>
                    </Card>
                  )}

                  {/* Results for each detected item */}
                  {message.results && message.results.length > 0 && (
                    <div className="space-y-6">
                      {message.results.map((result, idx) => (
                        <div key={idx} className="space-y-3">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-foreground">
                              {result.detectedItem.productType} - {result.detectedItem.color}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Search className="h-4 w-4" />
                              <span>&quot;{result.searchQuery}&quot;</span>
                            </div>
                          </div>

                          {result.products.length > 0 ? (
                            <>
                              <p className="text-sm text-muted-foreground">
                                Found {result.products.length} similar products
                              </p>
                              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {result.products.map((product) => (
                                  <ProductCard key={product.objectID} product={product} />
                                ))}
                              </div>
                              {(result.hasMore === undefined || result.hasMore === true) && (
                                <div className="flex justify-center pt-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => handleLoadMore(message.id, idx)}
                                    disabled={loadingMore[`${message.id}-${idx}`]}
                                  >
                                    {loadingMore[`${message.id}-${idx}`] ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Loading...
                                      </>
                                    ) : (
                                      <>Show 9 more products</>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </>
                          ) : (
                            <Card className="bg-muted/50 p-6 text-center">
                              <p className="text-muted-foreground">No matching products found for this item.</p>
                            </Card>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {message.content && (
                    <Card className="bg-card p-4">
                      <p className="text-foreground">{message.content}</p>
                    </Card>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Image Preview */}
            {selectedImage && (
              <div className="relative w-fit rounded-lg border border-border bg-muted p-2">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-background shadow-md"
                  onClick={() => setSelectedImage(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="relative h-24 w-24 overflow-hidden rounded">
                  <Image src={selectedImage || "/placeholder.svg"} alt="Selected" fill className="object-cover" />
                </div>
              </div>
            )}

            {/* Input Row */}
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
              >
                <ImagePlus className="h-5 w-5" />
              </Button>

              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Add a message (optional)..."
                disabled={isAnalyzing}
                className="flex-1"
              />

              <Button type="submit" size="icon" disabled={isAnalyzing || (!selectedImage && !inputMessage.trim())}>
                {isAnalyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

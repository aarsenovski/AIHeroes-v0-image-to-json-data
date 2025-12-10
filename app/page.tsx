"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShoppingBag, Heart, User, ImagePlus, Send, Loader2, X } from "lucide-react"
import { useState, useRef } from "react"
import Image from "next/image"
import type React from "react"
import { ProductCard } from "@/components/product-card"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

interface DetectedItem {
  color: string
  category: string
  subcategory?: string
  secondaryColors?: string[]
  gender?: string
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
  hasMore?: boolean
}

interface Message {
  id: string
  type: "user" | "assistant"
  content?: string
  imageUrl?: string
  analysis?: ProductAnalysis
  results?: ItemSearchResult[]
  analyzedImageUrl?: string
  timestamp: Date
}

export default function NewPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hasExistingResults, setHasExistingResults] = useState(false)
  const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({})
  const [selectedProducts, setSelectedProducts] = useState<Record<number, AlgoliaProduct>>({})
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
        content: "Please provide your requirements first before sending follow-up messages.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      setIsAnalyzing(false)
      return
    }

    try {
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
        analyzedImageUrl: imageToAnalyze,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setHasExistingResults(true)
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

  const handleSelectProduct = (categoryIndex: number, product: AlgoliaProduct) => {
    setSelectedProducts((prev) => ({
      ...prev,
      [categoryIndex]: product,
    }))
  }

  const calculateTotal = () => {
    return Object.values(selectedProducts).reduce((total, product) => {
      const price = product.prices?.GBP?.sellingPrice || 0
      return total + price
    }, 0)
  }

  const handleLoadMore = async (messageId: string, itemIndex: number) => {
    const message = messages.find((m) => m.id === messageId)
    if (!message?.results?.[itemIndex]) return

    const loadingKey = `${messageId}-${itemIndex}`
    setLoadingMore((prev) => ({ ...prev, [loadingKey]: true }))

    try {
      const result = message.results[itemIndex]
      const currentPage = Math.floor(result.products.length / 9) + 1

      const existingProductIds = result.products.map((p) => p.objectID)

      const response = await fetch("/api/load-more-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detectedItem: result.detectedItem,
          page: currentPage,
          existingProductIds,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to load more products")
      }

      const data = await response.json()

      if (data.products.length > 0) {
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
      } else {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId && msg.results) {
              const updatedResults = [...msg.results]
              updatedResults[itemIndex] = {
                ...updatedResults[itemIndex],
                hasMore: false,
              }
              return { ...msg, results: updatedResults }
            }
            return msg
          }),
        )
      }
    } catch (error) {
      console.error("Error loading more products:", error)
    } finally {
      setLoadingMore((prev) => ({ ...prev, [loadingKey]: false }))
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top Banner */}
      <div className="bg-foreground py-2 text-center text-xs text-background">
        24hr app exclusive: 20% off Tommy Hilfiger - Download now | T&Cs apply
      </div>

      {/* Main Header */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-6 w-6" />
              <span className="text-xl font-bold">Product Analyzer</span>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Heart className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-y-auto">
          {isAnalyzing && hasExistingResults && (
            <div className="sticky top-0 z-10 flex items-center justify-center gap-3 bg-primary/10 py-3 text-sm font-medium backdrop-blur-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing new requirements...</span>
            </div>
          )}

          {messages.length === 0 && !isAnalyzing ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="text-center space-y-4">
                <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
                <h2 className="text-2xl font-bold">Analyze new requirements to get started</h2>
                <p className="text-sm text-muted-foreground">Find similar products by describing your needs</p>
              </div>
            </div>
          ) : isAnalyzing && !hasExistingResults ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
              <div className="relative">
                <div className="relative w-32 h-32">
                  <svg
                    className="absolute inset-0 w-full h-full animate-spin"
                    style={{ animationDuration: "3s" }}
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M50 15 L50 25 M35 25 L65 25 L60 35 L40 35 Z M40 35 L40 70 L60 70 L60 35"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-primary"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-foreground">Analyzing Your Requirements...</p>
                <p className="text-sm text-muted-foreground">Our AI is finding the perfect matches for you</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="space-y-4">
                  {message.type === "assistant" && message.results && (
                    <div className="mx-auto max-w-7xl px-4 py-6">
                      {message.analyzedImageUrl && (
                        <Card className="mb-6 overflow-hidden">
                          <div className="p-4">
                            <h3 className="mb-4 text-sm font-medium text-muted-foreground">Analyzed Requirements:</h3>
                            <div className="flex items-start gap-4">
                              <div className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-lg">
                                <Image
                                  src={message.analyzedImageUrl || "/placeholder.svg"}
                                  alt="Analyzed product"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {message.analysis?.items.map((item, idx) => (
                                  <div key={idx} className="space-y-2">
                                    <Badge variant="secondary">{item.category}</Badge>
                                    {item.color && <Badge>{item.color}</Badge>}
                                    {item.prominence && <Badge variant="outline">{item.prominence}</Badge>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </Card>
                      )}

                      {message.results.map((result, resultIndex) => (
                        <div key={resultIndex} className="mb-8">
                          <div className="mb-4">
                            <h3 className="text-lg font-semibold">
                              {result.detectedItem.category}
                              {result.detectedItem.color && ` - ${result.detectedItem.color}`}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Found {result.products.length} similar products
                            </p>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {result.products.map((product) => (
                              <ProductCard key={product.objectID} product={product} />
                            ))}
                          </div>

                          {result.hasMore && (
                            <div className="mt-6 flex justify-center">
                              <Button
                                variant="outline"
                                onClick={() => handleLoadMore(message.id, resultIndex)}
                                disabled={loadingMore[`${message.id}-${resultIndex}`]}
                              >
                                {loadingMore[`${message.id}-${resultIndex}`] ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading...
                                  </>
                                ) : (
                                  "Show 9 more products"
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Input Area */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-4">
          {messages.length > 0 && (
            <div className="mb-4 flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMessages([])
                  setSelectedImage(null)
                  setHasExistingResults(false)
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Clear Results
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

            <Button
              type="button"
              variant="outline"
              size="icon"
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
          </form>

          {selectedImage && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Image
                src={selectedImage || "/placeholder.svg"}
                alt="Selected"
                width={32}
                height={32}
                className="rounded"
              />
              <span>Image selected</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedImage(null)}
                disabled={isAnalyzing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}

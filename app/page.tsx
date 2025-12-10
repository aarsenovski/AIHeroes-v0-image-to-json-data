"use client"

import type React from "react"

import { ProductCard } from "@/components/product-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ImagePlus, Loader2, Search, Send, Sparkles, X } from "lucide-react"
import Image from "next/image"
import { useState, useRef } from "react"

interface ProductAnalysis {
  productType: string
  color: string
  confidence?: number
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

interface Message {
  id: string
  type: "user" | "assistant"
  content?: string
  imageUrl?: string
  analysis?: ProductAnalysis
  products?: AlgoliaProduct[]
  searchQuery?: string
  timestamp: Date
}

export default function ProductAnalyzerPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
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

    setInputMessage("")
    const currentImage = selectedImage
    setSelectedImage(null)

    if (!currentImage) {
      setIsAnalyzing(false)
      return
    }

    try {
      const response = await fetch("/api/analyze-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: currentImage }),
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
        products: result.products,
        searchQuery: result.searchQuery,
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
                  {message.analysis && (
                    <Card className="bg-card p-6">
                      <div className="mb-4 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">Detected:</span>
                          <Badge variant="default" className="text-sm">
                            {message.analysis.productType}
                          </Badge>
                          <Badge variant="secondary" className="text-sm">
                            {message.analysis.color}
                          </Badge>
                        </div>
                        {message.searchQuery && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Search className="h-4 w-4" />
                            <span>Searching: &quot;{message.searchQuery}&quot;</span>
                          </div>
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

                  {/* Product Grid */}
                  {message.products && message.products.length > 0 && (
                    <div>
                      <h3 className="mb-4 text-lg font-semibold text-foreground">
                        Similar Products ({message.products.length})
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {message.products.map((product) => (
                          <ProductCard key={product.objectID} product={product} />
                        ))}
                      </div>
                    </div>
                  )}

                  {message.products && message.products.length === 0 && (
                    <Card className="bg-muted/50 p-6 text-center">
                      <p className="text-muted-foreground">No matching products found.</p>
                    </Card>
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

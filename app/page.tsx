"use client"

import type React from "react"

import { useState } from "react"
import { Upload, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Image from "next/image"

interface ProductAnalysis {
  productType: string
  color: string
  confidence?: number
}

interface Message {
  id: string
  type: "user" | "assistant"
  content?: string
  imageUrl?: string
  analysis?: ProductAnalysis
  timestamp: Date
}

export default function ProductAnalyzerPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleImageSelect = (file: File) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      setSelectedImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith("image/")) {
        handleImageSelect(file)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageSelect(e.target.files[0])
    }
  }

  const analyzeImage = async () => {
    if (!selectedImage) return

    setIsAnalyzing(true)

    // Add user message with image
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      imageUrl: selectedImage,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    try {
      const response = await fetch("/api/analyze-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: selectedImage }),
      })

      if (!response.ok) {
        throw new Error("Analysis failed")
      }

      const result = await response.json()

      // Add assistant message with analysis
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        analysis: result,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Analysis error:", error)
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: "Sorry, there was an error analyzing the image. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsAnalyzing(false)
      setSelectedImage(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Product Analyzer</h1>
          </div>
          <p className="text-lg text-muted-foreground">Upload product images to extract structured data</p>
        </div>

        {/* Messages */}
        <div className="mb-6 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
              <Card
                className={`max-w-lg p-4 ${message.type === "user" ? "bg-primary text-primary-foreground" : "bg-card"}`}
              >
                {message.imageUrl && (
                  <div className="relative mb-2 h-48 w-full overflow-hidden rounded-lg">
                    <Image
                      src={message.imageUrl || "/placeholder.svg"}
                      alt="Uploaded product"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                {message.analysis && (
                  <div className="space-y-3">
                    <p className="font-semibold text-foreground">Analysis Result:</p>
                    <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                      <code>{JSON.stringify(message.analysis, null, 2)}</code>
                    </pre>
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Product Type:</span>
                        <span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-semibold text-primary">
                          {message.analysis.productType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">Color:</span>
                        <span className="rounded-full bg-accent/20 px-3 py-1 text-sm font-semibold text-accent-foreground">
                          {message.analysis.color}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {message.content && <p className="text-foreground">{message.content}</p>}
              </Card>
            </div>
          ))}
        </div>

        {/* Upload Area */}
        <Card className="p-6">
          <div
            className={`relative rounded-lg border-2 border-dashed transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-border bg-background"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center py-12">
              {selectedImage ? (
                <div className="w-full space-y-4">
                  <div className="relative mx-auto h-64 w-full max-w-md overflow-hidden rounded-lg">
                    <Image
                      src={selectedImage || "/placeholder.svg"}
                      alt="Selected product"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex justify-center gap-3">
                    <Button onClick={analyzeImage} disabled={isAnalyzing} size="lg" className="gap-2">
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Analyze Product
                        </>
                      )}
                    </Button>
                    <Button onClick={() => setSelectedImage(null)} variant="outline" size="lg">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="mb-2 text-lg font-semibold text-foreground">Upload a product image</p>
                  <p className="mb-4 text-sm text-muted-foreground">Drag and drop or click to select</p>
                  <input type="file" id="file-upload" className="hidden" accept="image/*" onChange={handleFileChange} />
                  <Button asChild size="lg">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      Select Image
                    </label>
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

"use client";

import type React from "react";

import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Search, Sparkles, Upload } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface DetectedItem {
  productType: string;
  color: string;
  category: string;
  subcategory?: string;
  secondaryColors?: string[];
  gender?: "Mens" | "Womens" | "Unisex" | "Kids";
  brand?: string;
  style?: string;
  fit?: string;
  material?: string;
  pattern?: string;
  sleeveLength?: string;
  prominence?: "primary" | "secondary";
  confidence?: number;
}

interface ProductAnalysis {
  items: DetectedItem[];
  imageContext?: string;
}

interface AlgoliaProduct {
  objectID: string;
  alternativeImages?: string[];
  name?: { "en-GB"?: string };
  brand?: string;
  colourName?: { "en-GB"?: string };
  prices?: {
    GBP?: {
      sellingPrice: number;
      ticketPrice: number;
      discountPercentage: number;
    };
  };
  cleansize?: { "en-GB"?: string[] };
  productLink?: string;
  activitygroup?: { "en-GB"?: string[] };
  category?: { "en-GB"?: string[] };
  colourCode?: string;
}

interface ItemSearchResult {
  detectedItem: DetectedItem;
  searchQuery: string;
  products: AlgoliaProduct[];
}

interface Message {
  id: string;
  type: "user" | "assistant";
  content?: string;
  imageUrl?: string;
  analysis?: ProductAnalysis;
  results?: ItemSearchResult[];
  analyzedImageUrl?: string; // Store the image that was analyzed
  timestamp: Date;
}

export default function ProductAnalyzerPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleImageSelect = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        handleImageSelect(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageSelect(e.target.files[0]);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      imageUrl: selectedImage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      console.log("[v0] Sending image to API for analysis...");

      // Build conversation messages from previous messages
      const conversationMessages = messages
        .filter((msg) => msg.type === "assistant" && msg.content)
        .map((msg) => ({
          role: "assistant" as const,
          content: msg.content || "",
        }));

      const response = await fetch("/api/analyze-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: selectedImage,
          messages: conversationMessages,
        }),
      });

      console.log("[v0] API response status:", response.status);

      let result;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        const text = await response.text();
        result = { error: "Server error", details: text };
      }

      console.log("[v0] API response data:", result);

      if (!response.ok) {
        console.error("[v0] API error response:", result);
        throw new Error(result.error || result.details || "Analysis failed");
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        analysis: result.analysis,
        results: result.results,
        analyzedImageUrl: selectedImage, // Store the analyzed image
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("[v0] Analysis error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: `Sorry, there was an error analyzing the image: ${
          error instanceof Error ? error.message : String(error)
        }`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsAnalyzing(false);
      setSelectedImage(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">
              Product Analyzer
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Upload product images to find similar items
          </p>
        </div>

        {/* Messages */}
        <div className="mb-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.type === "user" ? (
                <Card className="max-w-sm bg-primary p-4 text-primary-foreground">
                  {message.imageUrl && (
                    <div className="relative h-48 w-full overflow-hidden rounded-lg">
                      <Image
                        src={message.imageUrl || "/placeholder.svg"}
                        alt="Uploaded product"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                </Card>
              ) : (
                <div className="w-full space-y-4">
                  {/* Show analyzed image */}
                  {message.analyzedImageUrl && (
                    <Card className="bg-card p-4">
                      <div className="mb-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Analyzed Image:
                        </span>
                      </div>
                      <div className="relative h-64 w-full max-w-md overflow-hidden rounded-lg">
                        <Image
                          src={message.analyzedImageUrl}
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
                          <p className="mt-2 text-sm text-muted-foreground">
                            {message.analysis.imageContext}
                          </p>
                        )}
                      </div>

                      {/* JSON Output */}
                      <details className="group">
                        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                          View JSON Data
                        </summary>
                        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-4 text-xs">
                          <code>
                            {JSON.stringify(message.analysis, null, 2)}
                          </code>
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
                              {result.detectedItem.productType} -{" "}
                              {result.detectedItem.color}
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
                                  <ProductCard
                                    key={product.objectID}
                                    product={product}
                                  />
                                ))}
                              </div>
                            </>
                          ) : (
                            <Card className="bg-muted/50 p-6 text-center">
                              <p className="text-muted-foreground">
                                No matching products found for this item.
                              </p>
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

        {/* Upload Area */}
        <Card className="p-6">
          <div
            className={`relative rounded-lg border-2 border-dashed transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border bg-background"
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
                    <Button
                      onClick={analyzeImage}
                      disabled={isAnalyzing}
                      size="lg"
                      className="gap-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Analyze &amp; Find Products
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setSelectedImage(null)}
                      variant="outline"
                      size="lg"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="mb-2 text-lg font-semibold text-foreground">
                    Upload a product image
                  </p>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Drag and drop or click to select
                  </p>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
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
  );
}

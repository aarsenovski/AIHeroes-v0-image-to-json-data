"use client";

import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Heart,
  ImagePlus,
  Loader2,
  Search,
  Send,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useRef, useState } from "react";

interface DetectedItem {
  color: string;
  category: string;
  subcategory?: string;
  secondaryColors?: string[];
  gender?: string;
  brand?: string;
  style?: string;
  fit?: string;
  material?: string;
  pattern?: string;
  sleeveLength?: string;
  prominence?: "primary" | "secondary";
  maxPrice?: number;
  minPrice?: number;
  currency?: string;
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
  hasMore?: boolean;
}

interface Message {
  id: string;
  type: "user" | "assistant";
  content?: string;
  imageUrl?: string;
  analysis?: ProductAnalysis;
  results?: ItemSearchResult[];
  analyzedImageUrl?: string;
  timestamp: Date;
}

export default function NewPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({});
  const [selectedProducts, setSelectedProducts] = useState<
    Record<number, AlgoliaProduct>
  >({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageSelect(e.target.files[0]);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedImage && !inputMessage.trim()) return;

    setIsAnalyzing(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage.trim() || undefined,
      imageUrl: selectedImage || undefined,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const userContext = inputMessage.trim();
    setInputMessage("");
    const currentImage = selectedImage;
    setSelectedImage(null);

    const imageToAnalyze =
      currentImage ||
      messages.findLast((msg) => msg.type === "user" && msg.imageUrl)?.imageUrl;

    if (!imageToAnalyze) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content:
          "Please upload an image first before sending follow-up messages.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsAnalyzing(false);
      return;
    }

    try {
      const conversationMessages = messages
        .filter((msg) => msg.type === "user" && msg.content)
        .map((msg) => ({
          role: "user" as const,
          content: msg.content || "",
        }));

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
      });

      let result;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        const text = await response.text();
        result = { error: "Server error", details: text };
      }

      if (!response.ok) {
        throw new Error(result.error || result.details || "Analysis failed");
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        analysis: result.analysis,
        results: result.results,
        analyzedImageUrl: imageToAnalyze,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
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
    }
  };

  const handleSelectProduct = (
    categoryIndex: number,
    product: AlgoliaProduct
  ) => {
    setSelectedProducts((prev) => ({
      ...prev,
      [categoryIndex]: product,
    }));
  };

  const calculateTotal = () => {
    return Object.values(selectedProducts).reduce((total, product) => {
      const price = product.prices?.GBP?.sellingPrice || 0;
      return total + price;
    }, 0);
  };

  const handleLoadMore = async (messageId: string, itemIndex: number) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message?.results?.[itemIndex]) return;

    const loadingKey = `${messageId}-${itemIndex}`;
    setLoadingMore((prev) => ({ ...prev, [loadingKey]: true }));

    try {
      const result = message.results[itemIndex];
      const currentPage = Math.floor(result.products.length / 9) + 1;

      const existingProductIds = result.products.map((p) => p.objectID);

      const response = await fetch("/api/load-more-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detectedItem: result.detectedItem,
          page: currentPage,
          existingProductIds,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to load more products");
      }

      const data = await response.json();

      if (data.products.length > 0) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId && msg.results) {
              const updatedResults = [...msg.results];
              updatedResults[itemIndex] = {
                ...updatedResults[itemIndex],
                products: [
                  ...updatedResults[itemIndex].products,
                  ...data.products,
                ],
                hasMore: data.hasMore,
              };
              return { ...msg, results: updatedResults };
            }
            return msg;
          })
        );
      } else {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId && msg.results) {
              const updatedResults = [...msg.results];
              updatedResults[itemIndex] = {
                ...updatedResults[itemIndex],
                hasMore: false,
              };
              return { ...msg, results: updatedResults };
            }
            return msg;
          })
        );
      }
    } catch (error) {
      console.error("Error loading more products:", error);
    } finally {
      setLoadingMore((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top Banner */}
      <div className="bg-foreground py-2 text-center text-xs text-background">
        24hr app exclusive: 20% off Tommy Hilfiger - Download now | T&Cs apply
      </div>

      {/* Main Header */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4">
          {/* Top Header Row */}
          <div className="flex items-center justify-between py-4">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <svg
                width="2701"
                height="647"
                viewBox="0 0 2701 647"
                className="h-8 w-auto"
                fill="none"
              >
                <path
                  d="M2339.27 445.071V455.399H2299.84H2296.78C2290.96 455.235 2284.48 454.252 2277.84 452.94C2268.22 450.973 2259.5 447.858 2252.64 444.333L2251.9 444.005C2229.9 432.119 2201.8 408.757 2190.69 364.737C2171.08 287.519 2142.16 254.238 2106.22 254.238H2056.79V397.854C2056.79 420.889 2073.72 440.07 2094 444.005V455.481H1941.76V442.038C1954.36 436.627 1979.11 422.856 1979.11 397.854V68.4064C1979.11 44.4704 1962.56 24.551 1941.39 21.8459V10.7797H2108.38C2108.38 10.7797 2130.3 10.7796 2160.27 13.9766C2237.06 24.1412 2277.84 54.3071 2277.84 131.935C2277.84 196.776 2240.27 232.434 2173.54 245.713C2173.54 245.713 2212.09 245.221 2238.11 280.634C2238.11 280.634 2258.31 297.848 2287.31 399.74C2287.31 399.74 2299.98 445.071 2339.12 445.071H2339.27ZM2170.19 216.449C2188.45 195.054 2190.62 159.97 2190.62 123.246C2190.62 92.0965 2185.62 64.3078 2170.93 46.1098C2156.25 27.9119 2133.21 21.8459 2106.45 21.8459H2056.79V242.434H2105.1C2132.46 242.434 2151.85 237.844 2170.11 216.449H2170.19ZM2659.7 266.452C2649.04 248.664 2635.62 233.417 2619.44 220.63C2603.34 207.842 2585.97 196.939 2567.4 187.841C2548.84 178.742 2531.47 169.725 2515.37 160.872C2499.26 152.018 2485.84 142.1 2475.11 131.279C2464.45 120.459 2459.08 107.261 2459.08 91.6866C2459.08 71.3574 2464.97 56.1105 2476.82 45.8639C2488.68 35.6993 2502.99 30.617 2519.84 30.617C2533.33 30.617 2546.68 33.65 2559.8 39.716C2572.92 45.782 2585 53.9792 2596.11 64.3897C2607.14 74.8003 2616.91 86.9322 2625.33 100.786C2633.76 114.639 2639.87 129.64 2643.6 145.625H2656.94V26.4364C2651.2 26.9283 2645.16 27.1742 2638.97 27.0102C2628.98 26.7643 2619.59 25.6987 2611.09 23.8953L2606.92 23.0755C2599.54 21.2721 2591.63 19.2228 2583.36 16.9276C2573.96 14.3045 2564.05 12.0912 2553.54 10.1239C2543.02 8.15653 2532.14 7.17285 2520.88 7.17285C2477.34 7.17285 2444.91 16.3538 2423.52 34.7976C2402.12 53.2415 2391.46 82.7516 2391.46 123.492C2391.46 146.854 2396.9 166.61 2407.79 182.594C2418.67 198.661 2432.24 212.514 2448.57 224.154C2464.89 235.876 2482.49 246.205 2501.42 255.304C2520.36 264.403 2538.03 273.83 2554.28 283.585C2570.61 293.339 2584.18 304.16 2595.06 316.046C2605.95 327.932 2611.39 342.769 2611.39 360.557C2611.39 373.59 2609.45 384.247 2605.5 392.69C2601.55 401.133 2595.96 407.855 2588.65 412.855C2581.34 417.856 2572.62 421.381 2562.48 423.594C2552.34 425.725 2541.09 426.873 2528.71 426.873C2514.47 426.873 2500.01 423.184 2485.4 415.806C2470.78 408.429 2457.14 398.592 2444.62 386.214C2432.02 373.836 2421.06 359.901 2411.66 344.326C2402.27 328.751 2395.56 312.931 2391.39 296.864H2379.01C2384.23 322.03 2398.54 420.725 2401.52 444.989C2401.52 444.989 2432.31 438.349 2451.03 439.824C2458.86 440.398 2466.31 441.546 2473.24 443.103L2476 443.595C2479.21 444.333 2482.41 445.153 2485.62 445.972C2494.79 448.349 2504.11 450.481 2513.5 452.448C2522.9 454.416 2532.29 455.399 2541.61 455.399C2561.89 455.399 2580.23 452.448 2596.78 446.628C2613.25 440.808 2627.34 432.529 2638.97 421.954C2650.6 411.38 2659.63 398.428 2665.96 383.263C2672.37 368.098 2675.5 351.212 2675.5 332.604C2675.5 306.209 2670.14 284.076 2659.48 266.37L2659.7 266.452ZM749.89 444.989V455.317H710.451H707.395C701.58 455.153 695.094 454.17 688.458 452.858C678.841 450.891 670.119 447.776 663.26 444.251L662.514 443.923C640.521 432.037 612.415 408.675 601.307 364.655C581.699 287.437 552.773 254.156 516.839 254.156H467.41V397.772C467.41 420.807 484.334 439.988 504.612 443.923V455.399H352.376V441.956C364.975 436.545 389.727 422.774 389.727 397.772V68.4064C389.727 44.4704 373.176 24.551 352.003 21.8459V10.7797H519.001C519.001 10.7797 540.919 10.7796 570.889 13.9766C647.678 24.1412 688.458 54.3071 688.458 131.935C688.458 196.776 650.884 232.434 584.16 245.713C584.16 245.713 622.703 245.221 648.722 280.634C648.722 280.634 668.926 297.848 697.926 399.74C697.926 399.74 710.6 445.071 749.741 445.071L749.89 444.989ZM580.805 216.367C599.07 194.972 601.232 159.888 601.232 123.164C601.232 92.0145 596.237 64.2258 581.55 46.0279C566.863 27.8299 543.827 21.764 517.062 21.764H467.41V242.352H515.72C543.081 242.352 562.465 237.762 580.73 216.367H580.805ZM1480.5 220.63C1464.4 207.842 1447.03 196.939 1428.47 187.841C1409.9 178.742 1392.53 169.725 1376.43 160.872C1360.33 152.018 1346.91 142.1 1336.17 131.279C1325.51 120.459 1320.14 107.261 1320.14 91.6866C1320.14 71.3574 1326.03 56.1105 1337.88 45.8639C1349.74 35.6993 1364.05 30.617 1380.9 30.617C1394.4 30.617 1407.74 33.65 1420.86 39.716C1433.98 45.782 1446.06 53.9792 1457.17 64.3897C1468.2 74.8003 1477.97 86.9322 1486.39 100.786C1494.82 114.639 1500.93 129.64 1504.66 145.625H1518V26.4364C1512.26 26.9283 1506.22 27.1742 1500.04 27.0102C1490.05 26.7643 1480.65 25.6987 1472.15 23.8953L1467.98 23.0755C1460.6 21.2721 1452.7 19.2228 1444.42 16.9276C1435.03 14.3045 1425.11 12.0912 1414.6 10.1239C1404.09 8.15653 1393.2 7.17285 1381.95 7.17285C1338.41 7.17285 1305.98 16.3538 1284.58 34.7976C1263.18 53.2415 1252.52 82.7516 1252.52 123.492C1252.52 146.854 1257.96 166.61 1268.85 182.594C1279.73 198.661 1293.3 212.514 1309.63 224.154C1325.96 235.876 1343.55 246.205 1362.49 255.304C1381.42 264.403 1399.09 273.83 1415.34 283.585C1431.67 293.339 1445.24 304.16 1456.12 316.046C1467.01 327.932 1472.45 342.769 1472.45 360.557C1472.45 373.59 1470.51 384.247 1466.56 392.69C1462.61 401.133 1457.02 407.855 1449.71 412.855C1442.41 417.856 1433.68 421.381 1423.55 423.594C1413.41 425.725 1402.15 426.873 1389.77 426.873C1375.53 426.873 1361.07 423.184 1346.46 415.806C1331.85 408.429 1318.2 398.592 1305.68 386.214C1293.08 373.836 1282.12 359.901 1272.73 344.326C1263.33 328.751 1256.62 312.931 1252.45 296.864H1240.07C1245.29 322.03 1259.6 420.725 1262.59 444.989C1262.59 444.989 1293.38 438.349 1312.09 439.824C1319.92 440.398 1327.37 441.546 1334.31 443.103L1337.06 443.595C1340.27 444.333 1343.48 445.153 1346.68 445.972C1355.85 448.349 1365.17 450.481 1374.56 452.448C1383.96 454.416 1393.35 455.399 1402.67 455.399C1422.95 455.399 1441.29 452.448 1457.84 446.628C1474.32 440.808 1488.41 432.529 1500.04 421.954C1511.67 411.38 1520.69 398.428 1527.02 383.263C1533.44 368.098 1536.57 351.212 1536.57 332.604C1536.57 306.209 1531.2 284.076 1520.54 266.37C1509.88 248.582 1496.46 233.335 1480.28 220.548L1480.5 220.63ZM17.9336 10.4518V14.9603C35.7516 20.4524 49.022 40.1258 49.022 63.3241L48.7238 397.936C48.7238 419.085 30.9057 432.119 17.9336 438.841V455.153H162.64V443.759C142.511 439.906 125.736 420.807 125.736 397.854L126.035 237.68H219.002C238.162 237.68 254.414 253.746 258.962 275.305H263.957V178.086H258.962C254.414 199.645 238.162 215.711 219.002 215.711H126.035V31.7646L236.149 32.0925C255.309 32.0925 271.561 48.1592 276.109 69.718H281.104L275.736 10.3698H17.9336V10.4518ZM1873.69 69.1441H1879.14L1873.25 10.1239H1590.32V14.4684C1609.85 19.9606 1624.39 39.552 1624.39 62.7503L1624.02 403.265C1624.02 426.135 1609.4 445.398 1589.95 450.481V455.153H1876.9L1877.35 395.641H1871.9C1866.91 417.2 1849.09 433.185 1828.07 433.185H1709.01V236.942H1809.21C1830.23 236.942 1848.05 253.009 1853.04 274.486H1858.48V177.348H1853.04C1848.05 198.907 1830.23 214.891 1809.21 214.891H1708.93V31.2728L1829.71 31.6007C1850.73 31.6007 1868.55 47.6673 1873.54 69.1441H1873.69ZM1072.25 385.968L1041.76 290.388H898.473L865.073 393.346C859.034 412.118 867.981 432.939 885.053 439.66C885.053 439.66 893.627 442.283 897.205 442.283V442.529C897.205 442.529 897.205 455.235 897.131 455.235H797.081V440.972L802.971 440.726C819.298 439.742 834.432 428.348 840.471 410.478L973.1 10.4518H1033.49L1167.23 408.839C1173.57 428.266 1181.1 440.48 1198.84 439.988V455.317H1052.8V441.956C1053.54 441.546 1054.14 440.972 1054.81 440.48C1070.91 429.168 1078.59 406.707 1072.18 385.968H1072.25ZM1036.1 272.518L970.714 67.5047L904.213 272.518H1036.1Z"
                  fill="black"
                />
                <path
                  d="M1359.32 530.399V579.306H1302.49V530.399H1288V644.34H1302.49V593.033H1359.32V644.34H1373.82V530.399H1359.32Z"
                  fill="black"
                />
                <path
                  d="M1452.1 632.389C1431.22 632.389 1409.76 615.687 1409.76 587.034C1409.76 558.381 1431.79 542.303 1452.1 542.303C1473.55 542.303 1495.58 557.229 1495.58 587.034C1495.58 616.839 1472.97 632.389 1452.1 632.389ZM1452.1 528C1414.37 528 1394.12 558.429 1394.12 587.034C1394.12 615.639 1415.52 646.74 1452.1 646.74C1488.67 646.74 1510.65 615.687 1510.65 587.034C1510.65 558.381 1490.35 528 1452.1 528Z"
                  fill="black"
                />
                <path
                  d="M1618.45 530.399V597.257C1618.45 621.158 1606.84 645.588 1574.97 645.588C1543.1 645.588 1531.48 621.158 1531.48 597.257V530.399H1545.98V597.257C1545.98 618.758 1557.02 631.861 1575.54 631.861C1583.66 631.861 1603.96 628.885 1603.96 597.257V530.399H1618.45Z"
                  fill="black"
                />
                <path
                  d="M1738.48 530.399V644.34H1796.46V630.037H1753.55V593.609H1787.2V579.882H1753.55V544.702H1796.46V530.399H1738.48Z"
                  fill="black"
                />
                <path
                  d="M2003.41 530.399V644.34H2017.9V593.609H2055V579.882H2017.9V544.702H2064.84V530.399H2003.41Z"
                  fill="black"
                />
                <path
                  d="M2252.7 585.834H2237.05V543.55H2253.85C2269.49 543.55 2278.23 551.901 2278.23 566.204C2278.23 578.731 2268.97 585.882 2252.7 585.882M2271.85 596.009L2272.42 595.433C2285.14 590.057 2292.72 578.731 2292.72 566.204C2292.72 542.35 2278.23 530.399 2250.39 530.399H2222.55V644.388H2237.1V599.032H2258.55C2258.55 599.032 2278.81 643.188 2279.43 644.388H2297.38C2295.7 641.988 2271.89 596.057 2271.89 596.057"
                  fill="black"
                />
                <path
                  d="M2343.17 604.36L2362.32 547.678L2363.42 545.278L2382.57 604.36H2343.17ZM2372.11 530.399H2355.26C2354.69 531.599 2313.6 641.988 2312.98 644.388H2329.2C2329.2 643.188 2339.09 618.135 2339.09 618.135H2387.23C2387.23 618.135 2396.49 643.188 2397.07 644.388H2413.34C2412.19 641.988 2372.73 531.599 2372.16 530.399"
                  fill="black"
                />
                <path
                  d="M2136.75 530.399V644.34H2151.29V593.609H2188.34V579.882H2151.29V544.702H2198.76V530.399H2136.75Z"
                  fill="black"
                />
                <path
                  d="M1921.11 632.389C1900.23 632.389 1878.2 615.687 1878.2 587.034C1878.2 558.381 1900.23 542.303 1921.11 542.303C1941.99 542.303 1964.02 557.805 1964.02 587.034C1964.02 616.263 1941.99 632.389 1921.11 632.389ZM1921.11 528C1883.43 528 1862.55 558.429 1862.55 587.034C1862.55 615.639 1884.58 646.74 1921.11 646.74C1957.63 646.74 1979.66 615.687 1979.66 587.034C1979.66 558.381 1959.41 528 1921.11 528Z"
                  fill="black"
                />
                <path
                  d="M2521.72 530.399V644.34H2579.12V630.661H2536.21V593.609H2569.86V579.882H2536.21V544.702H2579.12V530.399H2521.72Z"
                  fill="black"
                />
                <path
                  d="M2633.27 586.459L2618.77 585.883H2617.57V544.079H2634.42C2650.06 544.079 2658.75 551.854 2658.75 566.157C2658.75 573.884 2655.3 586.411 2633.27 586.411M2652.37 596.01H2652.94C2665.71 590.059 2673.25 578.684 2673.25 566.157C2673.25 542.303 2658.75 530.353 2630.96 530.353H2603.12V644.341H2617.57V599.562H2639.07C2639.07 599.562 2659.38 643.141 2659.9 644.341H2677.85C2676.7 641.941 2652.37 596.01 2652.37 596.01Z"
                  fill="black"
                />
                <path
                  d="M1700.22 613.911C1700.22 601.385 1687.46 597.209 1674.11 592.409C1659.04 586.458 1642.77 581.083 1642.77 561.981C1642.77 529.776 1673.54 528 1679.92 528C1697.3 528 1708.91 533.951 1711.79 535.151C1711.21 536.351 1708.33 547.678 1708.33 549.502C1704.88 547.102 1694.46 541.151 1680.5 541.151C1664.85 541.151 1657.89 550.702 1657.89 559.677C1657.89 571.58 1669.51 575.131 1682.23 579.355C1697.87 584.73 1715.29 590.106 1715.29 612.759C1715.29 632.437 1699.65 646.164 1677.62 646.164C1659.04 646.164 1642.82 636.661 1639.94 634.837C1640.52 634.261 1643.97 622.934 1644.55 621.159C1648.05 624.134 1662.55 633.061 1679.35 633.061C1694.42 633.061 1700.22 622.934 1700.22 613.959"
                  fill="black"
                />
                <path
                  d="M2483.46 613.911C2483.46 601.385 2470.7 597.209 2457.4 592.409C2442.33 586.458 2426.11 581.083 2426.11 561.981C2426.06 529.776 2456.73 528 2463.16 528C2480.54 528 2492.15 533.951 2495.03 535.151C2494.45 536.351 2491.58 547.678 2491.58 549.502C2488.07 547.102 2477.66 541.151 2463.74 541.151C2448.09 541.151 2441.13 550.702 2441.13 559.677C2441.13 571.58 2452.75 575.131 2464.84 579.355C2481.11 584.73 2498.49 590.106 2498.49 612.759C2498.49 632.437 2482.84 646.164 2460.76 646.164C2442.24 646.164 2426.01 636.661 2423.09 634.837C2423.66 634.261 2427.17 622.934 2427.69 621.159C2431.2 624.134 2445.69 633.061 2462.49 633.061C2477.56 633.061 2483.37 622.934 2483.37 613.959"
                  fill="black"
                />
                <path
                  d="M1120.81 647V577.182H1145.22C1150.09 577.182 1154.1 578.023 1157.26 579.705C1160.42 581.364 1162.77 583.602 1164.31 586.42C1165.86 589.216 1166.63 592.318 1166.63 595.727C1166.63 598.727 1166.1 601.205 1165.03 603.159C1163.98 605.114 1162.6 606.659 1160.87 607.795C1159.17 608.932 1157.31 609.773 1155.31 610.318V611C1157.45 611.136 1159.6 611.886 1161.76 613.25C1163.92 614.614 1165.72 616.568 1167.18 619.114C1168.63 621.659 1169.36 624.773 1169.36 628.455C1169.36 631.955 1168.56 635.102 1166.97 637.898C1165.38 640.693 1162.87 642.909 1159.44 644.545C1156.01 646.182 1151.54 647 1146.04 647H1120.81ZM1129.27 639.5H1146.04C1151.56 639.5 1155.48 638.432 1157.8 636.295C1160.14 634.136 1161.31 631.523 1161.31 628.455C1161.31 626.091 1160.71 623.909 1159.51 621.909C1158.3 619.886 1156.59 618.273 1154.36 617.068C1152.13 615.841 1149.5 615.227 1146.45 615.227H1129.27V639.5ZM1129.27 607.864H1144.95C1147.5 607.864 1149.79 607.364 1151.84 606.364C1153.9 605.364 1155.54 603.955 1156.75 602.136C1157.97 600.318 1158.59 598.182 1158.59 595.727C1158.59 592.659 1157.52 590.057 1155.38 587.92C1153.25 585.761 1149.86 584.682 1145.22 584.682H1129.27V607.864ZM1177.25 577.182H1186.93L1206.3 609.773H1207.12L1226.48 577.182H1236.16L1210.93 618.227V647H1202.48V618.227L1177.25 577.182Z"
                  fill="black"
                />
              </svg>
            </div>{" "}
            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search for brands, products..."
                  className="w-full pl-10"
                />
              </div>
            </div>
            {/* Action Icons */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Heart className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingBag className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="border-t border-border">
            <ul className="flex items-center justify-center gap-8 py-4 text-sm font-medium">
              <li>
                <a href="#" className="text-destructive hover:underline">
                  Sale
                </a>
              </li>
              <li>
                <a href="#" className="text-foreground hover:underline">
                  Christmas
                </a>
              </li>
              <li>
                <a href="#" className="text-foreground hover:underline">
                  Gifts
                </a>
              </li>
              <li>
                <a href="#" className="text-foreground hover:underline">
                  Men
                </a>
              </li>
              <li>
                <a href="#" className="text-foreground hover:underline">
                  Women
                </a>
              </li>
              <li>
                <a href="#" className="text-foreground hover:underline">
                  Homeware
                </a>
              </li>
              <li>
                <a href="#" className="text-foreground hover:underline">
                  Kids & Baby
                </a>
              </li>
              <li>
                <a href="#" className="text-foreground hover:underline">
                  Designer
                </a>
              </li>
              <li>
                <a href="#" className="text-foreground hover:underline">
                  Beauty
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h2 className="text-4xl font-bold text-foreground mb-8 text-center">
            Visual Affinities
          </h2>

          {/* Sticky Cart Summary */}
          {Object.keys(selectedProducts).length > 0 && (
            <div className="sticky top-0 z-10 bg-background border border-border rounded-lg p-4 mb-6 shadow-lg">
              <div>
                <p className="text-sm text-muted-foreground">
                  Selected {Object.keys(selectedProducts).length} item(s)
                </p>
                <p className="text-2xl font-bold text-foreground">
                  Total: £{calculateTotal().toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-lg text-muted-foreground mb-4">
                Upload an image to discover similar fashion items from our
                collection
              </p>
              <p className="text-sm text-muted-foreground">
                Simply click the image button below to get started. Our AI will
                analyze your image and find matching products instantly.
              </p>
            </div>
          ) : isAnalyzing ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
              <div className="relative">
                {/* Fashion-themed animated loader */}
                <div className="relative w-32 h-32">
                  {/* Rotating hanger */}
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
                <p className="text-lg font-semibold text-foreground">
                  Analyzing Your Fashion...
                </p>
                <p className="text-sm text-muted-foreground">
                  Our AI is finding the perfect matches for you
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) =>
                message.type === "user" ? (
                  <div
                    key={message.id}
                    className={`flex justify-end ${
                      !message.content && message.type === "user" && "hidden"
                    }`}
                  >
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
                  </div>
                ) : (
                  <div key={message.id} className="flex justify-start">
                    <div className="w-full space-y-4">
                      {message.analyzedImageUrl && (
                        <Card className="bg-card p-6">
                          <div className="mb-4">
                            <h3 className="text-xl font-semibold text-foreground">
                              Analyzed Image
                            </h3>
                          </div>
                          <div className="relative h-96 w-full max-w-2xl overflow-hidden rounded-lg mx-auto">
                            <Image
                              src={
                                message.analyzedImageUrl || "/placeholder.svg"
                              }
                              alt="Analyzed product"
                              fill
                              className="object-contain"
                            />
                          </div>
                          {message.results && message.results.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {message.results.map((result, idx) => (
                                <div key={idx} className="flex flex-wrap gap-2">
                                  <Badge variant="default" className="text-sm">
                                    {result.detectedItem.subcategory}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className="text-sm"
                                  >
                                    {result.detectedItem.color}
                                  </Badge>
                                  {result.detectedItem.prominence ===
                                    "primary" && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      Primary
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </Card>
                      )}

                      {message.analysis && (
                        <Card className="bg-card p-6">
                          <div className="mb-6">
                            <h3 className="text-xl font-semibold text-foreground mb-4">
                              Detected {message.analysis.items.length} item(s)
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {message.analysis.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2"
                                >
                                  <Badge variant="default" className="text-sm">
                                    {item.subcategory}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className="text-sm"
                                  >
                                    {item.color}
                                  </Badge>
                                  {item.prominence === "primary" && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
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

                      {message.results && message.results.length > 0 && (
                        <div className="space-y-12 mt-12">
                          {message.results.map((result, idx) => (
                            <div key={idx} className="space-y-6 scroll-mt-8">
                              <div className="border-b border-border pb-4">
                                <h3 className="text-2xl font-bold text-foreground mb-2">
                                  {result.detectedItem.subcategory} -{" "}
                                  {result.detectedItem.color}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Search className="h-4 w-4" />
                                  <span>&quot;{result.searchQuery}&quot;</span>
                                </div>
                              </div>

                              {result.products.length > 0 ? (
                                <>
                                  <p className="text-base text-muted-foreground font-medium mb-4">
                                    Found {result.products.length} similar
                                    products
                                  </p>
                                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {result.products.map((product) => {
                                      const isSelected =
                                        selectedProducts[idx]?.objectID ===
                                        product.objectID;
                                      return (
                                        <div
                                          key={product.objectID}
                                          className="space-y-2"
                                        >
                                          <ProductCard product={product} />
                                          <Button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              handleSelectProduct(idx, product);
                                            }}
                                            variant={
                                              isSelected ? "default" : "outline"
                                            }
                                            className="w-full"
                                            size="sm"
                                          >
                                            {isSelected
                                              ? "✓ Selected"
                                              : "Select"}
                                          </Button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {(result.hasMore === undefined ||
                                    result.hasMore === true) && (
                                    <div className="flex justify-center pt-2">
                                      <Button
                                        variant="outline"
                                        onClick={() =>
                                          handleLoadMore(message.id, idx)
                                        }
                                        disabled={
                                          loadingMore[`${message.id}-${idx}`]
                                        }
                                      >
                                        {loadingMore[`${message.id}-${idx}`] ? (
                                          <>
                                            <Spinner className="mr-2 h-4 w-4 animate-spin" />
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
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Input Area */}
      <div className="border-t border-border bg-background">
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
                  <Image
                    src={selectedImage || "/placeholder.svg"}
                    alt="Selected"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            {/* Input Row */}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
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

              <Button
                type="submit"
                size="icon"
                disabled={
                  isAnalyzing || (!selectedImage && !inputMessage.trim())
                }
              >
                {isAnalyzing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>

            {/* Clear Results Button */}
            {messages.length > 0 && (
              <Button
                onClick={() => {
                  setMessages([]);
                  setSelectedProducts({});
                }}
                variant="outline"
                className="flex items-center justify-center gap-2 w-full"
              >
                <X className="h-4 w-4" />
                Clear Results
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

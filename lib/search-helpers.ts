import type { DetectedItem } from "./schemas";

export function buildSearchQuery(detectedItem: DetectedItem): string {
  const searchTerms = [
    detectedItem.gender,
    detectedItem.brand,
    detectedItem.color,
    ...(detectedItem.secondaryColors || []),
    detectedItem.productType,
    detectedItem.subcategory,
    detectedItem.style,
    detectedItem.fit,
    detectedItem.material,
    detectedItem.pattern,
    detectedItem.sleeveLength,
  ]
    .filter(Boolean)
    .filter((term) => typeof term === "string" && term.trim().length > 0);

  if (searchTerms.length > 0) {
    return searchTerms.join(" ");
  }

  return `${detectedItem.color} ${detectedItem.productType}`.trim();
}

export function validateEnvironmentVariables(requiredVars: string[]): void {
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(
        ", "
      )}. Please check your .env file.`
    );
  }
}

export function validateImageInput(image: unknown): image is string {
  if (!image) {
    throw new Error("No image provided");
  }

  if (typeof image !== "string") {
    throw new Error("Image must be a string (base64 or URL)");
  }

  if (image.trim().length === 0) {
    throw new Error("Image string is empty");
  }

  const isDataUrl = image.startsWith("data:image/");
  const isUrl = image.startsWith("http://") || image.startsWith("https://");

  if (!isDataUrl && !isUrl) {
    throw new Error("Image must be a valid data URL (base64) or HTTP(S) URL");
  }

  return true;
}

export function sanitizeConversationMessages(
  messages: unknown
): Array<{ role: "user" | "assistant" | "system"; content: string }> {
  if (!messages || !Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((msg) => {
      if (typeof msg !== "object" || msg === null) return false;
      const { role, content } = msg as Record<string, unknown>;
      if (!["user", "assistant", "system"].includes(role as string))
        return false;
      if (typeof content !== "string") return false;
      return true;
    })
    .map((msg) => {
      const { role, content } = msg as {
        role: "user" | "assistant" | "system";
        content: string;
      };
      return { role, content };
    });
}

export function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function formatErrorResponse(error: unknown): {
  error: string;
  details?: string;
  type?: string;
} {
  if (error instanceof Error) {
    return {
      error: error.message,
      type: error.name,
      ...(process.env.NODE_ENV === "development" && {
        details: error.stack,
      }),
    };
  }

  return {
    error: "An unexpected error occurred",
    details: String(error),
  };
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
      ...(process.env.NODE_ENV === "development" && {
        stack: this.stack,
        cause: this.cause,
      }),
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 400, "VALIDATION_ERROR", cause);
  }
}

export class AIAnalysisError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 500, "AI_ANALYSIS_ERROR", cause);
  }
}

export class AlgoliaSearchError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 500, "ALGOLIA_SEARCH_ERROR", cause);
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 500, "CONFIGURATION_ERROR", cause);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 404, "NOT_FOUND", cause);
  }
}

export class RateLimitError extends AppError {
  constructor(
    message: string = "Too many requests. Please try again later.",
    cause?: unknown
  ) {
    super(message, 429, "RATE_LIMIT_EXCEEDED", cause);
  }
}

export class TimeoutError extends AppError {
  constructor(message: string = "Request timeout", cause?: unknown) {
    super(message, 408, "TIMEOUT", cause);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function handleApiError(
  error: unknown,
  correlationId?: string
): Response {
  console.error(
    "[Error Handler]",
    correlationId ? `[${correlationId}]` : "",
    error
  );

  if (isAppError(error)) {
    return Response.json(
      {
        ...error.toJSON(),
        ...(correlationId && { correlationId }),
      },
      { status: error.statusCode }
    );
  }

  if (error && typeof error === "object" && "issues" in error) {
    return Response.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: error.issues,
        ...(correlationId && { correlationId }),
      },
      { status: 400 }
    );
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";

  return Response.json(
    {
      error: message,
      code: "INTERNAL_SERVER_ERROR",
      ...(correlationId && { correlationId }),
      ...(process.env.NODE_ENV === "development" && {
        stack: error instanceof Error ? error.stack : undefined,
      }),
    },
    { status: 500 }
  );
}

export function withErrorHandling<
  T extends (...args: any[]) => Promise<Response>
>(handler: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  }) as T;
}

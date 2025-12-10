import { z } from "zod";

const envSchema = z.object({
  ALGOLIA_APP_ID: z.string().min(1, "ALGOLIA_APP_ID is required"),
  ALGOLIA_API_KEY: z.string().min(1, "ALGOLIA_API_KEY is required"),
  ALGOLIA_ENVIRONMENT: z.enum(["production"]).default("production"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development")
    .optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("\n");

      throw new Error(
        `Environment validation failed:\n${missingVars}\n\nPlease check your .env file and ensure all required variables are set.`
      );
    }
    throw error;
  }
}

export function getEnvVar<K extends keyof Env>(key: K): Env[K] {
  const env = validateEnv();
  return env[key];
}

export function isEnvValid(): boolean {
  try {
    validateEnv();
    return true;
  } catch {
    return false;
  }
}

export function getConfig() {
  const env = process.env;

  return {
    algolia: {
      appId: env.ALGOLIA_APP_ID || "",
      apiKey: env.ALGOLIA_API_KEY || "",
      environment: env.ALGOLIA_ENVIRONMENT || "production",
      indexName: `hof_${env.ALGOLIA_ENVIRONMENT || "production"}_search`,
    },
    isDevelopment: env.NODE_ENV === "development",
    isProduction: env.NODE_ENV === "production",
    isTest: env.NODE_ENV === "test",
  };
}

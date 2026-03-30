import "dotenv/config";

const requiredEnvVars = [
  "PORT",
  "CORS_ORIGIN",
  "MONGODB_URI",
  "ACCESS_TOKEN_SECRET",
  "ACCESS_TOKEN_EXPIRY",
  "REFRESH_TOKEN_SECRET",
  "REFRESH_TOKEN_EXPIRY",
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && process.env.CORS_ORIGIN === "*") {
  console.warn("WARNING: CORS_ORIGIN is set to '*' - this is insecure for production!");
}

console.log("✓ Environment validation passed");
console.log(`  NODE_ENV: ${process.env.NODE_ENV || "development"}`);
console.log(`  PORT: ${process.env.PORT}`);
console.log(`  CORS_ORIGIN: ${process.env.CORS_ORIGIN}`);
console.log(`  MONGODB_URI: ${process.env.MONGODB_URI.replace(/:.*@/, ":****@")}`);

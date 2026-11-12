/** Loads .env for command-line scripts (Next.js loads it automatically for the app). */
try {
  process.loadEnvFile(".env");
} catch {
  // No .env file (e.g. CI or hosting, where variables are set directly). That's fine.
}

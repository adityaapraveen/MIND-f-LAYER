export const JWT_SECRET = process.env["JWT_SECRET"] ?? "CucumberInTheVodka"

// Gemini API config
export const GEMINI_API_KEY = process.env["GEMINI_API_KEY"] ?? "AIzaSyAML08PTgbUTnPXbRNRaS510nC2E4gjwRs"
export const GENERATION_MODEL = "gemini-2.5-flash-lite"
export const EMBEDDING_MODEL = "gemini-embedding-001"
export const EMBEDDING_DIMENSIONS = 768

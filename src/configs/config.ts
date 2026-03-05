// NVIDIA / OpenRouter API config
export const NVIDIA_API_KEY = process.env["NVIDIA_API_KEY"] ?? "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"
export const GENERATION_MODEL = "arcee-ai/trinity-mini:free"
export const EMBEDDING_MODEL = "nvidia/llama-nemotron-embed-vl-1b-v2"
export const EMBEDDING_DIMENSIONS = 2048
export const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

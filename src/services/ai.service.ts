import { GoogleGenerativeAI } from "@google/generative-ai"
import {
    GEMINI_API_KEY,
    EMBEDDING_MODEL,
    GENERATION_MODEL,
    EMBEDDING_DIMENSIONS,
} from "../configs/config.ts"

let genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
    if (!genAI) {
        if (!GEMINI_API_KEY) {
            throw new Error(
                "GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com"
            )
        }
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    }
    return genAI
}

/**
 * Simple retry wrapper for Gemini API calls with exponential backoff.
 */
async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelayMs = 1000
): Promise<T> {
    let lastError: Error | undefined
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn()
        } catch (err: any) {
            lastError = err
            // Only retry on 429 (rate limit) or 503 (service unavailable)
            if (err?.status === 429 || err?.status === 503) {
                const delay = baseDelayMs * Math.pow(2, attempt)
                console.warn(`Gemini API rate limited (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`)
                await new Promise((resolve) => setTimeout(resolve, delay))
                continue
            }
            throw err
        }
    }
    throw lastError
}

/**
 * Generate an embedding vector for a given text using Gemini's embedding model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    return withRetry(async () => {
        const ai = getGenAI()
        const model = ai.getGenerativeModel({ model: EMBEDDING_MODEL })

        const result = await model.embedContent({
            content: { parts: [{ text }], role: "user" },
            taskType: "RETRIEVAL_DOCUMENT" as any,
        })

        const embedding = result.embedding.values
        return embedding.slice(0, EMBEDDING_DIMENSIONS)
    })
}

/**
 * Generate an embedding optimized for queries (retrieval).
 */
export async function generateQueryEmbedding(
    query: string
): Promise<number[]> {
    return withRetry(async () => {
        const ai = getGenAI()
        const model = ai.getGenerativeModel({ model: EMBEDDING_MODEL })

        const result = await model.embedContent({
            content: { parts: [{ text: query }], role: "user" },
            taskType: "RETRIEVAL_QUERY" as any,
        })

        const embedding = result.embedding.values
        return embedding.slice(0, EMBEDDING_DIMENSIONS)
    })
}

/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    const length = Math.min(a.length, b.length)
    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < length; i++) {
        const valA = a[i]!
        const valB = b[i]!
        dotProduct += valA * valB
        normA += valA * valA
        normB += valB * valB
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB)
    if (denominator === 0) return 0
    return dotProduct / denominator
}

interface ContentWithScore {
    id: number
    title: string
    link: string
    type: string
    description: string
    score: number
    tags: string[]
}

/**
 * Ask a question against the user's saved content using RAG.
 */
export async function queryBrain(
    query: string,
    relevantContent: ContentWithScore[]
): Promise<string> {
    return withRetry(async () => {
        const ai = getGenAI()
        const model = ai.getGenerativeModel({ model: GENERATION_MODEL })

        // Build context from relevant content
        const contextParts = relevantContent.map((item, index) => {
            const tags = item.tags.length > 0 ? `Tags: ${item.tags.join(", ")}` : ""
            return `[${index + 1}] "${item.title}" (${item.type})
  Link: ${item.link}
  Description: ${item.description}
  ${tags}
  Relevance Score: ${(item.score * 100).toFixed(1)}%`
        })

        const systemPrompt = `You are a helpful AI assistant for a "Second Brain" knowledge management app. 
The user has saved various content items (articles, videos, tweets, documents, etc.) in their second brain.
Below is the relevant content from their saved items that matches their query.

=== SAVED CONTENT ===
${contextParts.join("\n\n")}
=== END SAVED CONTENT ===

Instructions:
- Answer the user's question based on their saved content above.
- Reference specific items by their title when relevant.
- If the content doesn't seem to answer the question, say so and suggest what they might save to fill the gap.
- Be concise but helpful.
- If there is no relevant content at all, let the user know their second brain doesn't have information on this topic yet.`

        const result = await model.generateContent([
            { text: systemPrompt },
            { text: `User's question: ${query}` },
        ])

        const response = result.response
        return response.text()
    })
}

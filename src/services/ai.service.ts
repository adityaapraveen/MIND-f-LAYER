import {
    NVIDIA_API_KEY,
    EMBEDDING_MODEL,
    GENERATION_MODEL,
    EMBEDDING_DIMENSIONS,
    OPENROUTER_ENDPOINT,
} from "../configs/config.ts"

/**
 * Simple retry wrapper for API calls with exponential backoff.
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
            if (err?.status === 429 || err?.status === 503 || err?.message?.includes("429") || err?.message?.includes("503")) {
                const delay = baseDelayMs * Math.pow(2, attempt)
                console.warn(`API rate limited (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`)
                await new Promise((resolve) => setTimeout(resolve, delay))
                continue
            }
            throw err
        }
    }
    throw lastError
}

/**
 * Generate an embedding vector for a given text using NVIDIA's Llama Nemotron model.
 */
async function fetchNvidiaEmbedding(text: string): Promise<number[]> {
    if (!NVIDIA_API_KEY) {
        throw new Error("NVIDIA_API_KEY is not set. Please provide a valid key.")
    }

    const response = await fetch(OPENROUTER_ENDPOINT.replace("/chat/completions", "/embeddings"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${NVIDIA_API_KEY}`,
        },
        body: JSON.stringify({
            input: [text],
            model: EMBEDDING_MODEL,
        }),
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`NVIDIA API error (${response.status}): ${errorText}`)
    }

    const data = (await response.json()) as { data: { embedding: number[] }[] }
    if (!data.data || data.data.length === 0) {
        throw new Error("NVIDIA API returned empty data.")
    }
    return data.data[0]!.embedding
}

/**
 * Generate an embedding vector for a given text.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    return withRetry(async () => {
        return await fetchNvidiaEmbedding(text)
    })
}

/**
 * Generate an embedding optimized for queries (retrieval).
 */
export async function generateQueryEmbedding(
    query: string
): Promise<number[]> {
    return withRetry(async () => {
        return await fetchNvidiaEmbedding(query)
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
 * Ask a question against the user's saved content using OpenRouter.
 */
export async function queryBrain(
    query: string,
    relevantContent: ContentWithScore[]
): Promise<string> {
    return withRetry(async () => {
        if (!NVIDIA_API_KEY) {
            throw new Error("NVIDIA_API_KEY (OpenRouter Key) is not set.")
        }

        // Build context from relevant content
        const contextParts = relevantContent.map((item, index) => {
            const tags = item.tags.length > 0 ? `Tags: ${item.tags.join(", ")}` : ""
            return `[${index + 1}] "${item.title}" (${item.type})\n  Link: ${item.link}\n  Description: ${item.description}\n  ${tags}\n  Relevance Score: ${(item.score * 100).toFixed(1)}%`
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

        const response = await fetch(OPENROUTER_ENDPOINT, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${NVIDIA_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": GENERATION_MODEL,
                "messages": [
                    { "role": "system", "content": systemPrompt },
                    { "role": "user", "content": `User's question: ${query}` }
                ],
                "reasoning": { "enabled": true }
            })
        });

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`OpenRouter API error (${response.status}): ${errorText}`)
        }

        const result = await response.json();
        const message = result.choices[0].message;

        // Log reasoning if present for debugging (could be extended to UI later)
        if (message.reasoning_details) {
            console.log("Model Reasoning:", message.reasoning_details);
        }

        return message.content;
    })
}

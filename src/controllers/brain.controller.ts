import type { Request, Response } from "express"
import { z } from "zod"
import { getDB } from "../database/db.ts"
import {
    generateQueryEmbedding,
    cosineSimilarity,
    queryBrain,
} from "../services/ai.service.ts"

const querySchema = z.object({
    query: z.string().min(1, "Query cannot be empty").max(500),
    topK: z.number().int().min(1).max(20).optional().default(5),
})

/**
 * POST /api/v1/brain/query
 * Ask a question against the user's saved content using semantic search + Gemini.
 */
export async function query(req: Request, res: Response) {
    try {
        const userId = req.userId
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" })
        }

        const parsed = querySchema.parse(req.body)
        const { query: userQuery, topK } = parsed
        const db = getDB()

        // 1. Get all embeddings for this user's content
        const rows = await db.all(
            `SELECT e.contentId, e.embedding, c.title, c.link, c.type, c.description
             FROM embeddings e
             JOIN content c ON e.contentId = c.id
             WHERE c.userId = ?`,
            [userId]
        )

        if (rows.length === 0) {
            return res.status(200).json({
                message:
                    "Your vault is empty! Start saving content to query it.",
                answer: null,
                relevantContent: [],
            })
        }

        // 2. Generate query embedding
        const queryEmbedding = await generateQueryEmbedding(userQuery)

        // 3. Compute cosine similarity against all stored embeddings
        const scored = rows
            .map((row: any) => {
                const storedEmbedding = JSON.parse(row.embedding) as number[]
                const score = cosineSimilarity(queryEmbedding, storedEmbedding)
                return {
                    id: row.contentId as number,
                    title: row.title as string,
                    link: row.link as string,
                    type: row.type as string,
                    description: (row.description ?? "") as string,
                    score,
                    tags: [] as string[],
                }
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)

        // 4. Fetch tags for the top results
        for (const item of scored) {
            const tags = await db.all(
                `SELECT t.title FROM tags t
                 JOIN content_tags ct ON t.id = ct.tagId
                 WHERE ct.contentId = ?`,
                [item.id]
            )
            item.tags = tags.map((t: any) => t.title as string)
        }

        // 5. Filter to only reasonably relevant results (similarity > 0.3)
        const relevant = scored.filter((item) => item.score > 0.3)

        if (relevant.length === 0) {
            return res.status(200).json({
                message:
                    "No content in your second brain seems related to this query.",
                answer:
                    "I couldn't find any saved content that's relevant to your question. Try saving more content or rephrasing your query.",
                relevantContent: [],
            })
        }

        // 6. Send to Gemini for RAG answer
        const answer = await queryBrain(userQuery, relevant)

        res.status(200).json({
            message: "Query completed",
            answer,
            relevantContent: relevant.map((item) => ({
                id: item.id,
                title: item.title,
                link: item.link,
                type: item.type,
                score: parseFloat((item.score * 100).toFixed(1)),
                tags: item.tags,
            })),
        })
    } catch (err: any) {
        if (err.name === "ZodError") {
            return res
                .status(400)
                .json({ error: "Validation failed", details: err.errors })
        }
        if (err.message?.includes("GEMINI_API_KEY")) {
            return res.status(503).json({
                error: "AI service unavailable",
                message: err.message,
            })
        }
        console.error("Brain query error:", err)
        res.status(500).json({ error: "Failed to query brain" })
    }
}

/**
 * POST /api/v1/brain/search
 * Pure semantic search — returns similar content without LLM answer.
 */
export async function semanticSearch(req: Request, res: Response) {
    try {
        const userId = req.userId
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" })
        }

        const parsed = querySchema.parse(req.body)
        const { query: searchQuery, topK } = parsed
        const db = getDB()

        const rows = await db.all(
            `SELECT e.contentId, e.embedding, c.title, c.link, c.type, c.description
             FROM embeddings e
             JOIN content c ON e.contentId = c.id
             WHERE c.userId = ?`,
            [userId]
        )

        if (rows.length === 0) {
            return res.status(200).json({
                message: "No content to search through.",
                results: [],
            })
        }

        const queryEmbedding = await generateQueryEmbedding(searchQuery)

        const scored = rows
            .map((row: any) => {
                const storedEmbedding = JSON.parse(row.embedding) as number[]
                const score = cosineSimilarity(queryEmbedding, storedEmbedding)
                return {
                    id: row.contentId as number,
                    title: row.title as string,
                    link: row.link as string,
                    type: row.type as string,
                    description: (row.description ?? "") as string,
                    score,
                }
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)

        // Fetch tags
        const results = await Promise.all(
            scored.map(async (item) => {
                const tags = await db.all(
                    `SELECT t.title FROM tags t
                     JOIN content_tags ct ON t.id = ct.tagId
                     WHERE ct.contentId = ?`,
                    [item.id]
                )
                return {
                    ...item,
                    score: parseFloat((item.score * 100).toFixed(1)),
                    tags: tags.map((t: any) => t.title as string),
                }
            })
        )

        res.status(200).json({
            message: "Search completed",
            results,
        })
    } catch (err: any) {
        if (err.name === "ZodError") {
            return res
                .status(400)
                .json({ error: "Validation failed", details: err.errors })
        }
        if (err.message?.includes("GEMINI_API_KEY")) {
            return res.status(503).json({
                error: "AI service unavailable",
                message: err.message,
            })
        }
        console.error("Semantic search error:", err)
        res.status(500).json({ error: "Search failed" })
    }
}

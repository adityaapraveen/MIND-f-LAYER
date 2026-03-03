import type { Request, Response } from "express"
import { z } from "zod"
import { getDB } from "../database/db.ts"
import { generateEmbedding } from "../services/ai.service.ts"

// ─── Validation Schemas ────────────────────────────────────────
const contentSchema = z.object({
    link: z.string().url("Must be a valid URL"),
    type: z.enum([
        "article",
        "video",
        "tweet",
        "document",
        "audio",
        "image",
        "other",
    ]),
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().max(1000).optional().default(""),
    tags: z.array(z.string().min(1).max(50)).max(10).optional().default([]),
})

const deleteSchema = z.object({
    contentId: z.number().int().positive(),
})

// ─── CREATE CONTENT ────────────────────────────────────────────
export async function createContent(req: Request, res: Response) {
    try {
        const userId = req.userId
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" })
        }

        const parsed = contentSchema.parse(req.body)
        const { link, type, title, description, tags } = parsed
        const db = getDB()

        // Insert the content
        const result = await db.run(
            `INSERT INTO content (link, type, title, description, userId) VALUES (?, ?, ?, ?, ?)`,
            [link, type, title, description, userId]
        )

        const contentId = result.lastID
        if (!contentId) {
            return res.status(500).json({ error: "Failed to create content" })
        }

        // Handle tags
        const tagIds: number[] = []
        for (const tagTitle of tags) {
            // Upsert tag
            await db.run(
                `INSERT OR IGNORE INTO tags (title) VALUES (?)`,
                [tagTitle.toLowerCase()]
            )
            const tag = await db.get(
                `SELECT id FROM tags WHERE title = ?`,
                [tagTitle.toLowerCase()]
            )
            if (tag) {
                tagIds.push(tag.id)
                await db.run(
                    `INSERT OR IGNORE INTO content_tags (contentId, tagId) VALUES (?, ?)`,
                    [contentId, tag.id]
                )
            }
        }

        // Generate and store embedding for semantic search
        const embeddingText = `${title}. ${description}. Tags: ${tags.join(", ")}. Type: ${type}`
        try {
            const embedding = await generateEmbedding(embeddingText)
            await db.run(
                `INSERT INTO embeddings (contentId, embedding) VALUES (?, ?)`,
                [contentId, JSON.stringify(embedding)]
            )
        } catch (embErr) {
            // Don't fail content creation if embedding fails
            console.error("Failed to generate embedding:", embErr)
        }

        res.status(201).json({
            message: "Content created successfully",
            content: {
                id: contentId,
                link,
                type,
                title,
                description,
                tags,
                userId,
            },
        })
    } catch (err: any) {
        if (err.name === "ZodError") {
            return res.status(400).json({ error: "Validation failed", details: err.errors })
        }
        console.error("Create content error:", err)
        res.status(500).json({ error: "Failed to create content" })
    }
}

// ─── GET ALL CONTENT (for the authenticated user) ──────────────
export async function getContent(req: Request, res: Response) {
    try {
        const userId = req.userId
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" })
        }

        const db = getDB()

        // Optional query params for filtering
        const { type, tag } = req.query

        let contentQuery = `
            SELECT c.id, c.link, c.type, c.title, c.description, c.createdAt
            FROM content c
            WHERE c.userId = ?
        `
        const params: any[] = [userId]

        if (type && typeof type === "string") {
            contentQuery += ` AND c.type = ?`
            params.push(type)
        }

        if (tag && typeof tag === "string") {
            contentQuery += ` AND c.id IN (
                SELECT ct.contentId FROM content_tags ct
                JOIN tags t ON ct.tagId = t.id
                WHERE t.title = ?
            )`
            params.push(tag.toLowerCase())
        }

        contentQuery += ` ORDER BY c.createdAt DESC`

        const contents = await db.all(contentQuery, params)

        // Fetch tags for each content item
        const result = await Promise.all(
            contents.map(async (content: any) => {
                const tags = await db.all(
                    `SELECT t.title FROM tags t
                     JOIN content_tags ct ON t.id = ct.tagId
                     WHERE ct.contentId = ?`,
                    [content.id]
                )
                return {
                    ...content,
                    tags: tags.map((t: any) => t.title),
                }
            })
        )

        res.status(200).json({
            message: "Content fetched successfully",
            count: result.length,
            content: result,
        })
    } catch (err) {
        console.error("Get content error:", err)
        res.status(500).json({ error: "Failed to fetch content" })
    }
}

// ─── DELETE CONTENT ────────────────────────────────────────────
export async function deleteContent(req: Request, res: Response) {
    try {
        const userId = req.userId
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" })
        }

        const parsed = deleteSchema.parse(req.body)
        const { contentId } = parsed
        const db = getDB()

        // Ensure the content belongs to this user
        const content = await db.get(
            `SELECT id FROM content WHERE id = ? AND userId = ?`,
            [contentId, userId]
        )

        if (!content) {
            return res
                .status(404)
                .json({ error: "Content not found or not authorized" })
        }

        // CASCADE will handle content_tags and embeddings
        await db.run(`DELETE FROM content WHERE id = ?`, [contentId])

        res.status(200).json({ message: "Content deleted successfully" })
    } catch (err: any) {
        if (err.name === "ZodError") {
            return res.status(400).json({ error: "Validation failed", details: err.errors })
        }
        console.error("Delete content error:", err)
        res.status(500).json({ error: "Failed to delete content" })
    }
}

// ─── SHARE BRAIN (toggle sharing link) ────────────────────────
export async function shareContent(req: Request, res: Response) {
    try {
        const userId = req.userId
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" })
        }

        const { share } = req.body
        const db = getDB()

        // Handle both boolean and string "false"
        if (share === false || share === "false") {
            await db.run(`DELETE FROM links WHERE userId = ?`, [userId])
            return res.status(200).json({ message: "Share link disabled successfully" })
        }

        // Check if a share link already exists
        const existing = await db.get(
            `SELECT hash FROM links WHERE userId = ?`,
            [userId]
        )

        if (existing) {
            return res.status(200).json({
                message: "Sharing is active",
                hash: existing.hash,
                shareLink: `/api/v1/brain/${existing.hash}`,
            })
        }

        // Generate a new unique hash if none exists
        const { v4: uuidv4 } = await import("uuid")
        const hash = uuidv4().replace(/-/g, "").slice(0, 12)

        await db.run(`INSERT INTO links (hash, userId) VALUES (?, ?)`, [
            hash,
            userId,
        ])

        res.status(201).json({
            message: "Share link created successfully",
            hash,
            shareLink: `/api/v1/brain/${hash}`,
        })
    } catch (err) {
        console.error("Share content error:", err)
        res.status(500).json({ error: "Failed to manage share link" })
    }
}

// ─── GET SHARED CONTENT (public — no auth needed) ─────────────
export async function getSharedContent(req: Request, res: Response) {
    try {
        const { shareLink } = req.params
        if (!shareLink) {
            return res.status(400).json({ error: "Share link is required" })
        }

        const db = getDB()

        // Find the user who owns this share link
        const link = await db.get(
            `SELECT userId FROM links WHERE hash = ?`,
            [shareLink]
        )

        if (!link) {
            return res
                .status(404)
                .json({ error: "Share link not found or has been removed" })
        }

        // Fetch all content for the shared user
        const contents = await db.all(
            `SELECT c.id, c.link, c.type, c.title, c.description, c.createdAt
             FROM content c WHERE c.userId = ?
             ORDER BY c.createdAt DESC`,
            [link.userId]
        )

        const result = await Promise.all(
            contents.map(async (content: any) => {
                const tags = await db.all(
                    `SELECT t.title FROM tags t
                     JOIN content_tags ct ON t.id = ct.tagId
                     WHERE ct.contentId = ?`,
                    [content.id]
                )
                return {
                    ...content,
                    tags: tags.map((t: any) => t.title),
                }
            })
        )

        // Get the username for display
        const user = await db.get(
            `SELECT username FROM users WHERE id = ?`,
            [link.userId]
        )

        res.status(200).json({
            message: "Shared brain content",
            username: user?.username ?? "Unknown",
            count: result.length,
            content: result,
        })
    } catch (err) {
        console.error("Get shared content error:", err)
        res.status(500).json({ error: "Failed to fetch shared content" })
    }
}

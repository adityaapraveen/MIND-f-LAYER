import type { Request, Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { getDB } from '../database/db.ts'
import { JWT_SECRET } from '../configs/config.ts'

const authSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters")
})

export async function signup(req: Request, res: Response) {
    try {
        const parsed = authSchema.parse(req.body)
        const { username, password } = parsed

        const db = getDB()

        // Check if user already exists
        const existing = await db.get(
            `SELECT id FROM users WHERE username = ?`,
            [username]
        )

        if (existing) {
            return res.status(409).json({ error: "User already exists" })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const result = await db.run(
            `INSERT INTO users (username, password) VALUES (?, ?)`,
            [username, hashedPassword]
        )

        const userId = result.lastID

        const token = jwt.sign({ userId }, JWT_SECRET, {
            expiresIn: "7d"
        })

        res.status(201).json({
            message: "Account created successfully",
            token,
            userId,
        })

    } catch (err: any) {
        if (err.name === "ZodError") {
            return res.status(400).json({ error: "Validation failed", details: err.errors })
        }
        console.error("Signup error:", err)
        res.status(500).json({ error: "Something went wrong during signup" })
    }
}

export async function signin(req: Request, res: Response) {
    try {
        const parsed = authSchema.parse(req.body)
        const { username, password } = parsed

        const db = getDB()

        const user = await db.get(
            `SELECT * FROM users WHERE username = ?`,
            [username]
        )

        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" })
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
            expiresIn: "7d"
        })

        res.status(200).json({
            message: "Signed in successfully",
            token,
            userId: user.id,
        })
    } catch (err: any) {
        if (err.name === "ZodError") {
            return res.status(400).json({ error: "Validation failed", details: err.errors })
        }
        console.error("Signin error:", err)
        res.status(500).json({ error: "Something went wrong during signin" })
    }
}

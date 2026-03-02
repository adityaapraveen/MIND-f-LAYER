import type { Request, Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { getDB } from '../database/db.ts'

const JWT_SECRET = "CucumberInTheVodka"

const authSchema = z.object({
    username: z.string().min(3),
    password: z.string().min(6)
})

export async function signup(req: Request, res: Response) {

    try {
        const parsed = authSchema.parse(req.body)
        const { username, password } = parsed

        const db = getDB()

        const hashedPassword = await bcrypt.hash(password, 10)

        const result = await db.run(
            `INSERT INTO users (username, password) VALUES (?, ?)`,
            [username, hashedPassword]
        )

        const userId = result.lastID

        const token = jwt.sign({ userId }, JWT_SECRET, {
            expiresIn: "7d"
        })

        res.status(201).json({ token })

    } catch (err: any) {
        if (err.name === "ZodError") {
            return res.status(400).json({ errpr: err.errors })
        }
        res.status(400).json({ error: "User already exists" })
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
            return res.status(401).json({ error: "User does not exist" })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            return res.status(401).json({ error: "Invalid Password" })
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
            expiresIn: "7d"
        })

        res.status(200).json({ message: "signed In -", token })
    } catch (err: any) {
        if (err.name === "ZodError") {
            return res.status(400).json({ error: err.errors })
        }
        res.status(500).json({ error: "Something went wrong - ", err })
    }

}

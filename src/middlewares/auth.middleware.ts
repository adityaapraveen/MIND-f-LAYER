import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { JWT_SECRET } from "../configs/config.ts"

import type { JwtPayload } from "jsonwebtoken"

export interface TokenPayload extends JwtPayload {
    userId: number
}

declare global {
    namespace Express {
        interface Request {
            userId?: number
            user?: TokenPayload
        }
    }
}

export function userMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" })
    }

    const token = authHeader.split(" ")[1]

    if (!token) {
        return res.status(401).json({ error: "No token provided" })
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET)

        if (typeof decoded === "string") {
            return res.status(401).json({ error: "Invalid token" })
        }

        const payload = decoded as unknown as TokenPayload

        req.user = payload
        req.userId = payload.userId

        next()
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" })
    }
}
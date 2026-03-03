import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDB } from './database/db.ts'
import apiRouter from './routes/index.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT: number = 8000
const app = express()

// CORS - allow frontend dev server
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://localhost:8000'],
    credentials: true,
}))

app.use(express.json())

// Serve static React frontend
app.use(express.static(path.join(__dirname, '../frontend/dist')))

// Use versioned API routes
app.use('/api/v1', apiRouter)

// Catch-all: serve React app for any non-API route
app.get('{*path}', (req, res) => {
    const indexPath = path.join(__dirname, '../frontend/dist/index.html')
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.status(404).json({ error: 'Not found' })
        }
    })
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err)
    res.status(500).json({ error: 'Internal server error' })
})

// Database initialization and server startup using top-level await
try {
    console.log("Initializing database...")
    await initDB()

    const server = app.listen(PORT, () => {
        console.log("Server running on port", PORT)
        console.log("API:      http://localhost:" + PORT + "/api/v1")
        console.log("Frontend: http://localhost:5173 (dev) or http://localhost:" + PORT)
    })

    // Keep process alive and handle termination
    process.on('SIGINT', () => {
        server.close(() => {
            console.log('Server process terminated')
            process.exit(0)
        })
    })

} catch (error) {
    console.error("Failed to start server:", error)
    process.exit(1)
}
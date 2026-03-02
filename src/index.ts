import express from 'express'
import { initDB } from './database/db.ts'
import apiRouter from './routes/index.ts'

const PORT: number = 8000
const app = express()

app.use(express.json())

// Use versioned API routes
app.use('/api/v1', apiRouter)

// Database initialization and server startup
async function startServer() {
    await initDB()

    app.listen(PORT, () => {
        console.log("Server running on port", PORT)
    })
}

startServer()
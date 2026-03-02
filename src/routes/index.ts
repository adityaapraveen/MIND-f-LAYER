import { Router } from 'express'
import authRoutes from './auth.routes.ts'
import contentRoutes from './content.routes.ts'
import brainRoutes from './brain.routes.ts'

const router = Router()

// API v1 namespacing
router.use('/auth', authRoutes)
router.use('/content', contentRoutes)
router.use('/brain', brainRoutes)

export default router

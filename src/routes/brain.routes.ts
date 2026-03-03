import { Router } from 'express'
import * as contentController from '../controllers/content.controller.ts'
import * as brainController from '../controllers/brain.controller.ts'
import { userMiddleware } from '../middlewares/auth.middleware.ts'

const router = Router()

// Brain sharing endpoints (protected)
router.post('/share', userMiddleware, contentController.shareContent)

// Brain AI query endpoints (protected)
router.post('/query', userMiddleware, brainController.query)
router.post('/search', userMiddleware, brainController.semanticSearch)

// Public endpoint — access shared brain
router.get('/:shareLink', contentController.getSharedContent)

export default router

import { Router } from 'express'
import * as contentController from '../controllers/content.controller.ts'
import { userMiddleware } from '../middlewares/auth.middleware.ts'

const router = Router()

// All content routes are protected
router.use(userMiddleware)

// CRUD
router.post('/', contentController.createContent)
router.get('/', contentController.getContent)
router.delete('/', contentController.deleteContent)

export default router

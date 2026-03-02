import { Router } from 'express'
import * as contentController from '../controllers/content.controller.ts'

const router = Router()

// CRUD
router.post('/', contentController.createContent)
router.get('/', contentController.getContent)
router.delete('/', contentController.deleteContent)

export default router

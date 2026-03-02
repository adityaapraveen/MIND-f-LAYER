import { Router } from 'express'
import * as contentController from '../controllers/content.controller.ts'

const router = Router()

// Brain sharing endpoints
router.post('/share', contentController.shareContent)
router.get('/:shareLink', contentController.getSharedContent)

export default router

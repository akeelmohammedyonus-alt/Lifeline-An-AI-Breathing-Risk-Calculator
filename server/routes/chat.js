import express from 'express';
import { chatHandler } from '../controllers/chatController.js';

const router = express.Router();
router.post('/', chatHandler);

export default router;

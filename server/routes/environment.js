import express from 'express';
import { environmentHandler } from '../controllers/environmentController.js';

const router = express.Router();
router.get('/', environmentHandler);

export default router;

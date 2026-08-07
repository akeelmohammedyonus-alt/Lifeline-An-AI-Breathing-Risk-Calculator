import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';
import chatRoutes from './routes/chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api/chat', chatRoutes);

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timezone: config.timezone });
});

export default app;

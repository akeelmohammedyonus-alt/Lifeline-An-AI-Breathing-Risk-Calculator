import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';
import chatRoutes from './routes/chat.js';
import environmentRoutes from './routes/environment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const publicDir = path.join(__dirname, '..', 'public');
const srcDir = path.join(__dirname, '..', 'src');

app.use(cors());
app.use(express.json());
app.use(express.static(publicDir));
app.use('/src', express.static(srcDir));
app.use('/api/chat', chatRoutes);
app.use('/api/environment', environmentRoutes);

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timezone: config.timezone });
});

export default app;

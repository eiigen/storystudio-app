import express from 'express';
import cors from 'cors';
import { initDB } from './db.js';
import { storiesRouter, modelsRouter } from './routes/stories.js';
import { authRouter } from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const db = initDB();
app.locals.db = db;

app.use('/api/stories', storiesRouter);
app.use('/api/models', modelsRouter);
app.use('/api/auth', authRouter);
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`StoryStudio backend on :${PORT}`));

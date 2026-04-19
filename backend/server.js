import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: "*"
  
}));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

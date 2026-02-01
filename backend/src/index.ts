import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Import des routes
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import contractorRoutes from './routes/contractors';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import dashboardRoutes from './routes/dashboard';
import calendarRoutes from './routes/calendar';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/contractors', contractorRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/calendar', calendarRoutes);

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Gestion des erreurs
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Une erreur interne est survenue'
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

app.listen(PORT, () => {
  console.log(`🚀 IA Infinity CRM démarré sur le port ${PORT}`);
});

export default app;

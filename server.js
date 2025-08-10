import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import databaseConnection from './src/config/database.js';
import portfolioRoutes from './src/routes/portfolio.js';
import skillsRoutes from './src/routes/skills.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database service
let dbService;

async function initializeDatabase() {
  try {
    dbService = await databaseConnection.connect();
    console.log('Database connection established successfully');
    return true;
  } catch (error) {
    console.error('Failed to establish database connection:', error);
    console.error('Please ensure DATABASE_URL environment variable is set and MongoDB is accessible');
    return false;
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')));
}

// API Routes
app.use('/api', (req, res, next) => {
  req.dbService = dbService;
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const connectionInfo = await databaseConnection.getConnectionInfo();
    const healthStatus = await dbService.healthCheck();
    
    res.json({ 
      status: healthStatus.status === 'healthy' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: healthStatus,
      connection: {
        connected: connectionInfo.connected,
        initialized: connectionInfo.initialized,
        healthMonitoring: connectionInfo.healthMonitoring
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: { status: 'error', error: error.message }
    });
  }
});

// API Routes
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/skills', skillsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else if (process.env.NODE_ENV === 'production') {
    // Serve index.html for client-side routing in production
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Shutting down server gracefully...`);
  
  try {
    console.log('Closing database connection...');
    await databaseConnection.disconnect();
    console.log('Database connection closed successfully');
  } catch (error) {
    console.error('Error during database cleanup:', error);
  }
  
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start server with database initialization
async function startServer() {
  const dbInitialized = await initializeDatabase();
  
  if (!dbInitialized) {
    console.error('Failed to initialize database. Server will not start.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('MongoDB connection established');
  });
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
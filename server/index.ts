import { spawn } from 'child_process';
import * as path from 'path';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Create Express app
const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '8000', 10);
const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? `http://0.0.0.0:${BACKEND_PORT}` 
  : `http://localhost:${BACKEND_PORT}`;

// Add CORS middleware for Replit deployment
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Start Python backend in a child process
console.log('Python backend should be started separately...');
// Commented out to avoid conflicts when running backend separately
/*
try {
  const pythonProcess = spawn('python', ['run.py'], {
    cwd: path.join(process.cwd(), 'python-backend'),
    stdio: 'inherit',
    env: { ...process.env, PORT: BACKEND_PORT.toString() }
  });

  pythonProcess.on('error', (error) => {
    console.error('Failed to start Python backend:', error);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('Terminating Python backend...');
    pythonProcess.kill('SIGINT');
    process.exit();
  });

  process.on('SIGTERM', () => {
    console.log('Terminating Python backend...');
    pythonProcess.kill('SIGTERM');
    process.exit();
  });
} catch (error) {
  console.error('Error starting Python backend:', error);
}
*/

// Set up proxy to forward API requests to Python backend
app.use('/api/v1', (req, res, next) => {
  console.log(`Proxying API request to: ${req.url}`);
  next();
}, createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  timeout: 30000, // 30 second timeout
  proxyTimeout: 30000, // 30 second proxy timeout
  pathRewrite: {
    '^/api/v1': '/api/v1', // Keep /api/v1 prefix when forwarding to Python backend
  }
}));

// Add a fallback for /v1 routes (frontend might still use them)
app.use('/v1', (req, res, next) => {
  console.log(`Proxying v1 fallback request to: ${req.url}`);
  next();
}, createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/v1': '/api/v1', // Rewrite /v1 to /api/v1
  }
}));

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Node.js server is running',
    backend_url: BACKEND_URL,
    port: PORT 
  });
});

// Serve static files from dist/public if they exist
try {
  const distPath = path.join(process.cwd(), 'dist/public');
  app.use(express.static(distPath));
  console.log(`Serving static files from ${distPath}`);
  
  // Fallback for SPA routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} catch (error) {
  console.error('Error setting up static file serving:', error);
}

// Start Express server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Node.js server running on http://0.0.0.0:${PORT}`);
  console.log(`Proxying API requests to Python backend at ${BACKEND_URL}`);
});
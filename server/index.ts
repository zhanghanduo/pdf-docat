import { spawn } from 'child_process';
import * as path from 'path';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Start Python backend in a child process
console.log('Starting Python backend...');
try {
  const pythonProcess = spawn('python', ['run.py'], {
    cwd: path.join(process.cwd(), 'python-backend'),
    stdio: 'inherit'
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

// Set up proxy to forward API requests to Python backend
app.use('/api', (req, res, next) => {
  console.log(`Proxying request to: ${req.url}`);
  next();
}, createProxyMiddleware({
  target: 'http://localhost:8000',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api/v1', // Rewrite /api to /api/v1
  },
  onProxyReq: (proxyReq, req: any) => {
    // Debugging proxy request
    console.log(`Proxying ${req.method} ${req.url} to ${proxyReq.path}`);
    
    // If there's an authorization header, forward it
    if (req.headers.authorization) {
      console.log(`Forwarding authorization header: ${req.headers.authorization.substring(0, 15)}...`);
    }
  },
  onError: (err: Error, req: any, res: any) => {
    console.error('Proxy error:', err);
    res.status(500).json({
      error: 'Python backend is not available',
      message: 'The PDF processing service is currently unavailable'
    });
  }
}));

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Node.js server is running' });
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
app.listen(PORT, () => {
  console.log(`Node.js server running on http://localhost:${PORT}`);
  console.log(`Proxying API requests to Python backend at http://localhost:8000`);
});
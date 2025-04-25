import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { storage } from '../storage';

// Simple logger middleware
export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, path: url, ip } = req;
  const userId = req.user?.id;
  const userEmail = req.user?.email || 'Guest';

  res.on('finish', () => {
    const { statusCode } = res;
    const duration = Date.now() - start;
    const message = `[${new Date().toISOString()}] ${method} ${url} ${statusCode} ${duration}ms - User: ${userEmail} (${userId || 'unauthenticated'}) IP: ${ip}`;
    
    console.log(message);
    
    // For API endpoints, log additional details
    if (url.startsWith('/api')) {
      logToFile(message);
    }
  });
  
  next();
};

// Log user actions
export const logUserAction = (
  userId: number,
  action: string,
  details?: Record<string, any>
) => {
  const message = `[${new Date().toISOString()}] User Action: ${action} - User ID: ${userId} ${details ? `Details: ${JSON.stringify(details)}` : ''}`;
  console.log(message);
  logToFile(message);
};

// Helper to log to file
const logToFile = (message: string) => {
  const logsDir = path.join(process.cwd(), 'logs');
  
  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    try {
      fs.mkdirSync(logsDir, { recursive: true });
    } catch (err) {
      console.error('Failed to create logs directory:', err);
      return;
    }
  }
  
  const logFile = path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`);
  
  fs.appendFile(logFile, message + '\n', err => {
    if (err) {
      console.error('Failed to write to log file:', err);
    }
  });
};

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';

// Secret key for JWT signing and verification
// In a production environment, this should be an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'documind-secret-key';

// JWT token expiration in seconds (24 hours)
const TOKEN_EXPIRATION = 60 * 60 * 24;

// Auth middleware interface
export interface AuthUser {
  id: number;
  email: string;
  role: string;
}

// Express augmentation to include user in request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Generate JWT token
export const generateToken = (user: AuthUser): string => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRATION }
  );
};

// Verify JWT token middleware
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    
    // Update last active timestamp
    storage.updateUserLastActive(decoded.id).catch(err => {
      console.error('Failed to update last active timestamp:', err);
    });
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Check if user is admin
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Requires admin privileges' });
  }
  next();
};

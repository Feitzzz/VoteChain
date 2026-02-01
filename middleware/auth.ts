import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import User from '../models/User';

// Extend NextApiRequest to include user property
export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

// Define JWT error interfaces
interface JsonWebTokenError {
  name: 'JsonWebTokenError';
  message: string;
}

interface TokenExpiredError {
  name: 'TokenExpiredError';
  message: string;
  expiredAt: Date;
}

type JWTError = JsonWebTokenError | TokenExpiredError;

type ApiHandler = (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void> | void;

// Middleware to verify JWT token and authenticate user
export const authenticated = (handler: ApiHandler) => async (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication token required' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      email: string;
    };
    
    // Find user
    const user = await User.findById(decoded.id);
    if (!user || !user.isVerified) {
      return res.status(401).json({ success: false, message: 'User not found or not verified' });
    }
    
    // Add user data to request
    req.user = { 
      id: user._id.toString(), 
      email: user.email, 
      name: user.name 
    };
    
    // Proceed to the API route handler
    return handler(req, res);
  } catch (error) {
    // Check if error is a JWT error
    if (error instanceof Error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Invalid authentication token' });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Authentication token expired' });
      }
    }
    
    return res.status(500).json({ success: false, message: 'Server error during authentication' });
  }
}; 
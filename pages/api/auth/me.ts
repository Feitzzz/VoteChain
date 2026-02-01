import { NextApiResponse } from 'next';
import { authenticated, AuthenticatedRequest } from '../../../middleware/auth';
import dbConnect from '../../../utils/dbConnect';

type Data = {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Connect to the database
  await dbConnect();

  // User is already verified and attached to the request by the authenticated middleware
  return res.status(200).json({
    success: true,
    user: req.user
  });
}

// Wrap the handler with the authenticated middleware
export default authenticated(handler); 
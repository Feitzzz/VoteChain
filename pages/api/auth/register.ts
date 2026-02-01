import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../utils/dbConnect';
import User from '../../../models/User';
import bcrypt from 'bcryptjs';

type Data = {
  success: boolean;
  message: string;
  otpSent?: boolean;
  otp?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Connect to the database
  await dbConnect();

  try {
    const { name, nationalId, email, password } = req.body;

    // Validate required fields
    if (!name || !nationalId || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide all required fields' 
      });
    }

    // Validate NIN format (must be 11 digits)
    if (!/^\d{11}$/.test(nationalId)) {
      return res.status(400).json({
        success: false,
        message: 'National ID Number must be exactly 11 digits'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is already registered' 
      });
    }

    // Get all users to check for duplicate NIN
    const allUsers = await User.find({}).select('+nationalId');
    
    // Check each user's NIN against the provided NIN
    for (const user of allUsers) {
      try {
        // Only compare if the user has a nationalId field
        if (user.nationalId) {
          // Use bcrypt.compare directly to check if the NIN matches
          const isMatch = await bcrypt.compare(nationalId, user.nationalId);
          
          if (isMatch) {
            console.log(`NIN match found for user: ${user.email}`);
            return res.status(400).json({
              success: false,
              message: 'This National ID Number is already registered'
            });
          }
        }
      } catch (error) {
        console.error('Error comparing National ID:', error);
        // Continue with the next user
      }
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP expires in 10 minutes

    // Create the user (password and NIN will be hashed by the pre-save hook)
    const user = await User.create({
      name,
      nationalId,
      email,
      password,
      otp: {
        code: otpCode,
        expiresAt: otpExpiry
      }
    });

    // In a real application, you would send the OTP via email here
    console.log(`OTP for ${email}: ${otpCode}`); // Keep for server-side logging

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your OTP below.',
      otpSent: true,
      otp: otpCode,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred during registration. Please try again.' 
    });
  }
} 
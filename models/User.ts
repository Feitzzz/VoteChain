import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends mongoose.Document {
  name: string;
  nationalId: string;
  email: string;
  password: string;
  isVerified: boolean;
  otp: {
    code: string;
    expiresAt: Date;
  };
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  compareNationalId(candidateNationalId: string): Promise<boolean>;
}

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
  },
  nationalId: {
    type: String,
    required: [true, 'Please provide your National ID number'],
    unique: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    code: String,
    expiresAt: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
UserSchema.pre('save', async function(this: IUser, next) {
  if (!this.isModified('password') && !this.isModified('nationalId')) return next();
  
  // Hash password if modified
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  
  // Hash NIN if modified
  if (this.isModified('nationalId')) {
    this.nationalId = await bcrypt.hash(this.nationalId, 10);
  }
  
  next();
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(this: IUser, candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to compare National ID numbers
UserSchema.methods.compareNationalId = async function(this: IUser, candidateNationalId: string): Promise<boolean> {
  return await bcrypt.compare(candidateNationalId, this.nationalId);
};

// This creates the model if it doesn't exist or returns it if it does
const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User; 
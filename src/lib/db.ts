// src/lib/db.ts
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) throw new Error('Please define MONGODB_URI')

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return mongoose.connection

  return mongoose.connect(MONGODB_URI)
}

export default connectDB

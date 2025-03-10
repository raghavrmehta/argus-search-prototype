import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
  });
}

// Enable CORS for this route
export const config = {
  cors: {
    origin: '*',
    methods: ['GET'],
    allowedHeaders: ['Content-Type'],
  },
}; 
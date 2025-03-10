import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

// Simple list of binary file extensions
const BINARY_EXTENSIONS = [
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.mp3', '.mp4', 
  '.zip', '.exe', '.app', '.dmg', '.bin'
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');
  
  if (!filePath) {
    return NextResponse.json({ error: 'File path parameter is required' }, { status: 400 });
  }

  try {
    console.log(`[File Content API] Requested: ${filePath}`);
    
    // Security check - prevent directory traversal attacks
    const normalizedPath = path.normalize(filePath);
    const homeDir = process.env.HOME || '/Users/' + process.env.USER;
    
    if (!normalizedPath.startsWith(homeDir)) {
      return NextResponse.json({ 
        error: 'Access denied - can only read files within home directory' 
      }, { status: 403 });
    }

    // Check file extension for binary files
    const ext = path.extname(normalizedPath).toLowerCase();
    if (BINARY_EXTENSIONS.includes(ext)) {
      return NextResponse.json({
        error: 'Binary file cannot be read as text',
        binary: true,
        name: path.basename(normalizedPath)
      }, { status: 400 });
    }
    
    // Try to read file content
    try {
      const content = await readFile(normalizedPath, 'utf-8');
      
      // Limit content size
      const maxLength = 50000;
      const truncated = content.length > maxLength;
      const processedContent = truncated ? content.substring(0, maxLength) + '...' : content;

      return NextResponse.json({
        content: processedContent,
        truncated,
        name: path.basename(normalizedPath)
      });
    } catch (readError) {
      return NextResponse.json({ 
        error: `Error reading file: ${readError instanceof Error ? readError.message : String(readError)}` 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('File content API error:', error);
    return NextResponse.json({ 
      error: 'File access error' 
    }, { status: 500 });
  }
} 
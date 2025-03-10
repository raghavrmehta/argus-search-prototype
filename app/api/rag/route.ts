import { NextResponse } from 'next/server';
import { processFileContent, createContextWindow } from '@/lib/content-processor';
import { readFile } from 'fs/promises';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, filePaths } = body;
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    
    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return NextResponse.json({ error: 'At least one file path is required' }, { status: 400 });
    }
    
    console.log(`[RAG API] Processing ${filePaths.length} files for query: "${query}"`);
    
    // Process each file to extract content
    const processedChunks = [];
    
    for (const filePath of filePaths) {
      try {
        // Read file content
        const content = await readFile(filePath, 'utf-8');
        
        // Get file extension
        const fileExt = filePath.split('.').pop()?.toLowerCase() || '';
        
        // Process the content
        const { chunks, metadata } = await processFileContent(filePath, content, `.${fileExt}`);
        
        // Add each chunk with its metadata
        for (const chunk of chunks) {
          processedChunks.push({
            text: chunk,
            metadata: {
              ...metadata,
              chunkIndex: processedChunks.length
            }
          });
        }
      } catch (error) {
        console.error(`[RAG API] Error processing file ${filePath}:`, error);
        // Continue with other files
      }
    }
    
    // If no chunks were processed successfully, return an error
    if (processedChunks.length === 0) {
      return NextResponse.json({ 
        error: 'Could not process any of the provided files' 
      }, { status: 500 });
    }
    
    // Create context window from all chunks
    // In a real implementation, we would:
    // 1. Create embeddings for the query
    // 2. Retrieve most similar chunks
    // 3. Rank and filter the results
    
    // For now, we'll just use all chunks up to a token limit
    const context = createContextWindow(processedChunks, 8000);
    
    return NextResponse.json({
      context,
      files: {
        processed: processedChunks.length,
        paths: filePaths
      }
    });
  } catch (error) {
    console.error('[RAG API] Error:', error);
    return NextResponse.json({ 
      error: 'Error processing RAG request',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 
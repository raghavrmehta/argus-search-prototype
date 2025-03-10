import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);

// Define priority file extensions
const PRIORITY_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', 
  '.html', '.htm', '.md', '.markdown', '.txt'
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  
  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    console.log(`[Spotlight API] Received search query: "${query}"`);
    
    // Get the home directory
    const home = process.env.HOME || `/Users/${process.env.USER}`;
    const safeQuery = query.replace(/"/g, '\\"'); // Basic escaping
    
    // Simple command that should work on all macOS versions
    const command = `mdfind -onlyin "${home}" "${safeQuery}"`;
    
    console.log(`[Spotlight API] Executing command: ${command}`);
    
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      console.error('[Spotlight API] Search stderr:', stderr);
    }

    // Get the list of files found
    const files = stdout.trim().split('\n').filter(Boolean);
    console.log(`[Spotlight API] Found ${files.length} results`);
    
    // Process with minimal info
    const results = files.map(filePath => {
      const ext = path.extname(filePath).toLowerCase();
      return {
        path: filePath,
        name: path.basename(filePath),
        type: ext || 'unknown',
        isPriority: PRIORITY_EXTENSIONS.includes(ext)
      };
    });
    
    // Sort results - priority formats first, then alphabetically by name within each group
    const sortedResults = results.sort((a, b) => {
      // First sort by priority
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;
      
      // Then sort by name within priority groups
      return a.name.localeCompare(b.name);
    });
    
    // Limit to 50 results after sorting to avoid overwhelming the UI
    const limitedResults = sortedResults.slice(0, 50);
    
    return NextResponse.json({ 
      results: limitedResults,
      query,
      count: limitedResults.length,
      priorityCount: limitedResults.filter(r => r.isPriority).length
    });
    
  } catch (error) {
    console.error('[Spotlight API] Search error:', error);
    
    // Return empty results instead of error
    return NextResponse.json({ 
      results: [],
      query,
      count: 0,
      error: 'Error executing Spotlight search',
      message: error instanceof Error ? error.message : String(error)
    });
  }
} 
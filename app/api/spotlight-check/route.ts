import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function GET() {
  try {
    console.log('[Spotlight Check] Testing Spotlight availability');
    
    // Simple check if mdfind exists - just get help text
    const { stdout, stderr } = await execPromise('mdfind 2>&1 || echo "Not available"');
    
    // If we get usage instructions, mdfind exists
    const available = stdout.includes('Usage: mdfind');
    
    console.log(`[Spotlight Check] mdfind available: ${available}`);
    
    return NextResponse.json({
      available,
      details: stdout.slice(0, 500), // Limit size
      needsPermissions: !available
    });
  } catch (error) {
    console.error('[Spotlight Check] Error:', error);
    return NextResponse.json({
      available: false,
      error: 'Failed to check Spotlight availability',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 
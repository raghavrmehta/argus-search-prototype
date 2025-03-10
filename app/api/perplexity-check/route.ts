import { NextRequest, NextResponse } from 'next/server';
import { debug } from '@/lib/utils';

export async function GET() {
  debug.log('📥 /api/perplexity-check route called');
  
  try {
    // Try a HEAD request to the Perplexity API
    const result = await fetch('https://api.perplexity.ai/health', {
      method: 'HEAD',
      headers: {
        'Accept': 'application/json'
      }
    }).catch(error => {
      debug.error('Fetch error:', error);
      throw error;
    });
    
    return NextResponse.json({ 
      status: 'ok',
      perplexityStatus: result.status,
      perplexityOk: result.ok,
      headers: Object.fromEntries(result.headers.entries()),
      time: new Date().toISOString(),
    });
  } catch (error) {
    // If the HEAD request fails, try a different approach
    try {
      debug.log('First check failed, trying alternative method...');
      
      // Try to reach the domain with a DNS lookup
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const result = await fetch('https://api.perplexity.ai', {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      }).catch(error => {
        debug.error('Alternative fetch error:', error);
        throw error;
      });
      
      clearTimeout(timeoutId);
      
      return NextResponse.json({ 
        status: 'ok',
        method: 'alternative',
        perplexityStatus: result.status,
        perplexityOk: result.ok,
        time: new Date().toISOString(),
      });
    } catch (error) {
      // Domain is not reachable
      debug.error('Error checking Perplexity API:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return NextResponse.json({
        status: 'error',
        error: errorMessage,
        message: 'Cannot connect to Perplexity API domain',
        time: new Date().toISOString(),
      }, { status: 500 });
    }
  }
} 
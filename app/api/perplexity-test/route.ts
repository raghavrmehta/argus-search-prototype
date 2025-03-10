import { NextRequest, NextResponse } from 'next/server';
import { debug } from '@/lib/utils';

export async function POST(request: NextRequest) {
  debug.log('📥 /api/perplexity-test route called');
  
  try {
    // Parse the request body
    const body = await request.json();
    const { apiKey, model, query } = body;
    
    // Validate required fields
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }
    
    if (!model) {
      return NextResponse.json(
        { error: 'Model is required' },
        { status: 400 }
      );
    }
    
    debug.log(`Making test request to Perplexity API with model: ${model}`);
    
    // Create the request to the Perplexity API
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant.' },
          { role: 'user', content: query }
        ]
      })
    });
    
    // Get the response from the Perplexity API
    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      debug.error(`Perplexity API error (${perplexityResponse.status}):`, errorText);
      
      try {
        // Try to parse as JSON
        const errorJson = JSON.parse(errorText);
        return NextResponse.json(
          { error: errorJson.error || `API Error (${perplexityResponse.status})` },
          { status: perplexityResponse.status }
        );
      } catch (e) {
        // If not JSON, return text error
        return NextResponse.json(
          { error: `API Error (${perplexityResponse.status}): ${errorText}` },
          { status: perplexityResponse.status }
        );
      }
    }
    
    // Parse the response from the Perplexity API
    const data = await perplexityResponse.json();
    debug.log('Perplexity API response received successfully');
    
    // Return the response
    return NextResponse.json(data);
  } catch (error) {
    // Handle errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    debug.error('Error in perplexity-test route:', errorMessage);
    
    return NextResponse.json(
      { error: `Server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// Also handle GET requests with an informative error
export async function GET() {
  return NextResponse.json(
    { error: "This endpoint requires a POST request with apiKey, model, and query parameters" },
    { status: 405 }
  );
} 
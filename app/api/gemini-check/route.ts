import { NextRequest, NextResponse } from 'next/server';
import { debug } from '@/lib/utils';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

export async function POST(request: NextRequest) {
  debug.log('📥 /api/gemini-check route called');
  
  try {
    // Parse the request body
    const body = await request.json();
    const { apiKey, query } = body;
    
    // Validate required fields
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }
    
    debug.log(`Testing Gemini API with key length: ${apiKey.length}`);
    
    // Create a simple request to test the API
    try {
      const prompt = query || "Say hello";
      
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: query ? 200 : 20
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        debug.error('Gemini API error:', errorText);
        
        return NextResponse.json({
          success: false,
          status: response.status,
          error: errorText
        });
      }
      
      const data = await response.json();
      debug.log('Gemini API test successful');
      
      return NextResponse.json({
        success: true,
        data: data
      });
    } catch (error) {
      debug.error('Error testing Gemini API:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return NextResponse.json({
        success: false,
        error: errorMessage
      });
    }
  } catch (error) {
    debug.error('Error in gemini-check route:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'This endpoint requires a POST request with an apiKey parameter'
  }, { status: 405 });
} 
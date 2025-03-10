import { NextResponse } from 'next/server';
import { synthesizeWithClaude } from '@/lib/claude';
import { synthesizeWithGemini } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, localContext, webResearch, apiKey, model } = body;
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    
    if (!localContext && !webResearch) {
      return NextResponse.json({ 
        error: 'Either localContext or webResearch must be provided' 
      }, { status: 400 });
    }
    
    console.log(`[Synthesize API] Synthesizing answer for query: "${query}" using model: ${model}`);
    
    // Use the appropriate model based on selection
    let synthesisResult;
    
    if (model === 'gemini') {
      // Use Gemini
      synthesisResult = await synthesizeWithGemini(
        query,
        localContext || '',
        webResearch || '',
        apiKey
      );
    } else {
      // Default to Claude
      synthesisResult = await synthesizeWithClaude(
        query,
        localContext || '',
        webResearch || '',
        apiKey
      );
    }
    
    return NextResponse.json({
      content: synthesisResult.content,
      usage: 'usage' in synthesisResult ? synthesisResult.usage : undefined,
      error: synthesisResult.error,
      model: model
    });
  } catch (error) {
    console.error('[Synthesize API] Error:', error);
    return NextResponse.json({ 
      error: 'Error synthesizing answer',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 
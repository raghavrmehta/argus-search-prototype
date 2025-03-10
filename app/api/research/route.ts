import { NextRequest, NextResponse } from 'next/server';
import { performPerplexityResearch } from '@/lib/perplexity';
import { PerplexityAPI } from '@/lib/perplexity-api';
import { debug } from "@/lib/utils";

// Debug flag - turn off in production
const DEBUG = true;

function logDebug(...args: any[]) {
  if (DEBUG) {
    console.log('[Research API]', ...args);
  }
}

export async function POST(request: NextRequest) {
  debug.log("📥 /api/research route called");
  
  const startTime = Date.now();
  logDebug('Request received');
  
  try {
    // Parse the request body
    const body = await request.json();
    const { query, apiKey, model, forceReal } = body;
    
    debug.log(`Request details:
      - Query: ${query?.substring(0, 100)}${query?.length > 100 ? "..." : ""}
      - Model: ${model || "default model"}
      - API Key Present: ${Boolean(apiKey)}
      - Force Real: ${Boolean(forceReal)}
    `);
    
    // Validate required fields
    if (!query) {
      debug.error("Missing required field: query");
      return new NextResponse(
        JSON.stringify({ error: "Query is required" }),
        { status: 400 }
      );
    }
    
    // Test Perplexity API connectivity first if forcing real
    if (forceReal) {
      try {
        debug.log("Testing Perplexity API connectivity before making request");
        
        // Try a HEAD request to the Perplexity API
        const connectTest = await fetch('https://api.perplexity.ai/health', {
          method: 'HEAD',
          headers: {
            'Accept': 'application/json'
          },
          // Set a timeout so we don't wait forever
          signal: AbortSignal.timeout(10000)
        }).catch(error => {
          debug.error('Connectivity test error:', error);
          throw error;
        });
        
        if (!connectTest.ok) {
          debug.error(`Connectivity test failed with status: ${connectTest.status}`);
          return new NextResponse(
            JSON.stringify({
              error: `Cannot connect to Perplexity API: Server responded with ${connectTest.status}`,
              answer: "Error: Cannot connect to Perplexity API. Please check your internet connection and try again.",
              references: []
            }),
            { status: 502 }
          );
        }
        
        debug.log("Connectivity test passed, proceeding with request");
      } catch (connectError) {
        debug.error("Connectivity test failed with exception:", connectError);
        const errorMessage = connectError instanceof Error ? connectError.message : String(connectError);
        
        return new NextResponse(
          JSON.stringify({
            error: `Cannot connect to Perplexity API: ${errorMessage}`,
            answer: "Error: Cannot connect to Perplexity API. Please check your internet connection and try again.",
            references: []
          }),
          { status: 502 }
        );
      }
    }
    
    // Attempt to call the performPerplexityResearch function with appropriate error handling
    try {
      logDebug(`Calling performPerplexityResearch with model: ${model || "default"}`);
      const result = await performPerplexityResearch(
        query, 
        apiKey || "", 
        model,
        0, // Initial retry attempt
        Boolean(forceReal)
      );
      
      const duration = Date.now() - startTime;
      logDebug(`Request completed in ${duration}ms`);
      
      debug.log(`✅ Research completed ${result.simulated ? '(simulated)' : '(real)'} in ${duration}ms`);
      
      // Return the result
      return NextResponse.json(result);
    } catch (researchError) {
      // If performPerplexityResearch has a specific error, handle it
      const errorMessage = researchError instanceof Error ? researchError.message : String(researchError);
      debug.error(`❌ Error in performPerplexityResearch:`, errorMessage);
      
      // Create a simplified response with error information
      return new NextResponse(
        JSON.stringify({
          error: `Research API Error: ${errorMessage}`,
          answer: `Error performing web research: ${errorMessage}`,
          references: [],
          // Include error details for debugging
          errorDetails: {
            message: errorMessage,
            type: researchError instanceof Error ? researchError.name : typeof researchError,
            time: new Date().toISOString()
          }
        }),
        { status: 500 }
      );
    }
  } catch (error) {
    // Handle top-level errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    debug.error(`❌ Unexpected error in research route:`, errorMessage);
    
    return new NextResponse(
      JSON.stringify({ 
        error: `Server Error: ${errorMessage}`,
        answer: "Error processing your request. Please try again later.",
        references: []
      }),
      { status: 500 }
    );
  }
}

// Also handle GET requests with an informative error
export async function GET() {
  return new NextResponse(
    JSON.stringify({ error: "This endpoint requires a POST request with a query parameter" }),
    { status: 405 }
  );
} 
/**
 * Perplexity API client for web research
 * Using the robust PerplexityAPI implementation
 */

import { PerplexityAPI, type Message, type ChatCompletionResponse } from './perplexity-api';
import { debug } from "@/lib/utils";

// Default model to use if none is specified - ensure this matches a valid model
const DEFAULT_MODEL = 'sonar-deep-research';

// List of valid Perplexity models for reference and validation
const VALID_PERPLEXITY_MODELS = [
  'sonar-deep-research',
  'sonar-reasoning-pro',
  'sonar-reasoning',
  'sonar-pro',
  'sonar',
  'r1-1776'
];

// Debug flag to log extra information for troubleshooting
const DEBUG = true;

function logDebug(...args: any[]) {
  if (DEBUG) {
    console.log('[Perplexity Research]', ...args);
  }
}

// Interface for structured references
interface Reference {
  title: string;
  snippet: string;
  url: string;
}

// Interface for the complete research response
interface ResearchResponse {
  answer: string;
  references: Reference[];
  error?: string;
  simulated?: boolean;
  errorDetails?: any; // Detailed error information for debugging
  debug?: any; // Debug information
}

// Define the Perplexity API endpoint URL
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

// Define interface for Perplexity API response
export interface PerplexityResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Performs deep research using the Perplexity API
 */
export async function performPerplexityResearch(
  query: string,
  apiKey?: string,
  model: string = DEFAULT_MODEL,
  retryAttempt: number = 0,
  forceReal: boolean = false // Force real API call even with potential issues
): Promise<ResearchResponse> {
  // Validate model - fallback to default if invalid
  if (!VALID_PERPLEXITY_MODELS.includes(model)) {
    console.warn(`Invalid Perplexity model: "${model}", falling back to ${DEFAULT_MODEL}`);
    model = DEFAULT_MODEL;
  }

  const debugInfo: any = {
    apiKeyProvided: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    model,
    retryAttempt,
    forceReal,
    events: [],
    timestamp: new Date().toISOString()
  };

  try {
    // Log debug info
    if (DEBUG) {
      debugInfo.events.push({
        timestamp: new Date().toISOString(),
        event: 'start',
        message: `Starting research for query: "${query}"`
      });
      logDebug(`Starting research for: "${query}" using model: ${model}`);
    }

    // If no API key is provided, use simulation mode
    if (!apiKey) {
      if (DEBUG) {
        debugInfo.events.push({
          timestamp: new Date().toISOString(),
          event: 'no_api_key',
          message: 'No Perplexity API key provided, using simulated response'
        });
        logDebug('No API key provided, falling back to simulation');
      }
      console.log('No Perplexity API key provided, using simulated response');
      const simulated = simulatePerplexityResponse(query, model);
      if (DEBUG) simulated.debug = debugInfo;
      return simulated;
    }
    
    // Validate API key format
    if (!apiKey.startsWith('pplx-') && !forceReal) {
      if (DEBUG) {
        debugInfo.events.push({
          timestamp: new Date().toISOString(),
          event: 'invalid_api_key_format',
          message: 'API key does not start with "pplx-", may be invalid'
        });
        logDebug('API key appears to be in wrong format (should start with pplx-)');
      }
      console.warn('Warning: Perplexity API key does not start with "pplx-", may be invalid');
      
      if (forceReal) {
        logDebug('Proceeding anyway due to forceReal flag');
      } else {
        const simulated = simulatePerplexityResponse(query, model, 'API key format appears invalid (should start with pplx-)');
        if (DEBUG) simulated.debug = debugInfo;
        return simulated;
      }
    }
    
    if (DEBUG) {
      debugInfo.events.push({
        timestamp: new Date().toISOString(),
        event: 'using_api',
        message: `Using Perplexity API with model: ${model}`,
        apiKeyFragment: apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'none'
      });
      logDebug(`Using model: ${model} and API key: ${apiKey.substring(0, 4)}...`);
    }
    console.log(`Using Perplexity API with model: ${model}`);
    
    // Create messages for the research query
    const messages: Message[] = [
      {
        role: 'system',
        content: 'You are a research assistant that provides comprehensive, factual, and up-to-date information. Format citations at the end as a numbered list with titles, snippets, and URLs.'
      },
      {
        role: 'user',
        content: `Research this topic thoroughly with citations: ${query}`
      }
    ];
    
    try {
      if (DEBUG) {
        debugInfo.events.push({
          timestamp: new Date().toISOString(),
          event: 'request_attempt',
          message: `Sending request to Perplexity API... (attempt ${retryAttempt + 1})`
        });
        logDebug(`API request attempt ${retryAttempt + 1}`);
      }
      console.log(`Sending request to Perplexity API... (attempt ${retryAttempt + 1})`);
      
      // Create the API client
      const perplexityClient = new PerplexityAPI(apiKey);
      
      // Test connectivity before making the actual request
      if (retryAttempt === 0 && !forceReal) {
        if (DEBUG) {
          debugInfo.events.push({
            timestamp: new Date().toISOString(),
            event: 'connectivity_test',
            message: 'Testing connectivity to Perplexity API before research request...'
          });
          logDebug('Testing API connectivity...');
        }
        console.log('Testing connectivity to Perplexity API before research request...');
        const connectivityTest = await perplexityClient.testConnectivity();
        
        debugInfo.connectivityTest = connectivityTest;
        
        if (!connectivityTest.success) {
          if (DEBUG) {
            debugInfo.events.push({
              timestamp: new Date().toISOString(),
              event: 'connectivity_failed',
              message: `Connectivity test failed: ${connectivityTest.message}`,
              details: connectivityTest.details
            });
            logDebug('Connectivity test failed:', connectivityTest.message);
          }
          console.warn('Connectivity test failed:', connectivityTest.message);
          console.warn('Connectivity details:', connectivityTest.details);
          
          // If on first attempt and connectivity fails, try once more
          if (retryAttempt === 0) {
            if (DEBUG) {
              debugInfo.events.push({
                timestamp: new Date().toISOString(),
                event: 'retry',
                message: 'Connectivity test failed on first attempt, retrying...'
              });
              logDebug('Retrying after connectivity failure');
            }
            console.log('Connectivity test failed on first attempt, retrying...');
            return performPerplexityResearch(query, apiKey, model, 1, forceReal);
          }
          
          // If connectivity test fails on retry and we're not forcing real API calls,
          // fall back to simulation
          if (!forceReal) {
            if (DEBUG) {
              debugInfo.events.push({
                timestamp: new Date().toISOString(),
                event: 'fallback_to_simulation',
                message: `Cannot connect to Perplexity API: ${connectivityTest.message}`
              });
              logDebug('Falling back to simulation after connectivity failure');
            }
            throw new Error(`Cannot connect to Perplexity API: ${connectivityTest.message}`);
          }
        }
        
        if (DEBUG) {
          debugInfo.events.push({
            timestamp: new Date().toISOString(),
            event: 'connectivity_success',
            message: 'Connectivity test successful, proceeding with research request'
          });
          logDebug('Connectivity test succeeded');
        }
        console.log('Connectivity test successful, proceeding with research request');
      }
      
      // Force real API call even if connectivity test was skipped
      if (forceReal && retryAttempt > 0) {
        if (DEBUG) {
          debugInfo.events.push({
            timestamp: new Date().toISOString(),
            event: 'force_real',
            message: 'Forcing real API call even with potential connectivity issues'
          });
          logDebug('Forcing real API call');
        }
        console.log('Forcing real API call even with potential connectivity issues');
      }
      
      // Make the actual API call for research
      if (DEBUG) {
        debugInfo.events.push({
          timestamp: new Date().toISOString(),
          event: 'api_call_start',
          message: 'Making API call to Perplexity'
        });
        logDebug('Starting API call with model:', model);
      }
      
      // Try with a direct fetch call first as a workaround for potential axios issues
      let directFetchSuccess = false;
      let directFetchResponse: any = null;
      let directFetchError: any = null;
      
      try {
        if (DEBUG) logDebug('Attempting direct fetch first');
        
        const fetchResponse = await fetch(PERPLEXITY_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 4000,
            stream: false
          })
        });
        
        if (fetchResponse.ok) {
          directFetchSuccess = true;
          directFetchResponse = await fetchResponse.json();
          if (DEBUG) logDebug('Direct fetch succeeded!');
        } else {
          const errorText = await fetchResponse.text();
          directFetchError = new Error(`Fetch API error: ${fetchResponse.status} - ${errorText}`);
          if (DEBUG) logDebug('Direct fetch failed:', errorText);
        }
      } catch (fetchError) {
        directFetchError = fetchError;
        if (DEBUG) logDebug('Direct fetch threw an exception:', fetchError);
      }
      
      // Use the response from direct fetch if it succeeded
      let response;
      if (directFetchSuccess && directFetchResponse) {
        response = directFetchResponse;
        if (DEBUG) {
          debugInfo.events.push({
            timestamp: new Date().toISOString(),
            event: 'direct_fetch_success',
            message: 'Direct fetch API call succeeded when axios might have failed'
          });
          logDebug('Using successful direct fetch response');
        }
      } else {
        if (DEBUG) {
          if (directFetchError) {
            debugInfo.events.push({
              timestamp: new Date().toISOString(),
              event: 'direct_fetch_failed',
              message: `Direct fetch failed: ${directFetchError.message}`,
              error: directFetchError instanceof Error ? directFetchError.message : String(directFetchError)
            });
            logDebug('Direct fetch failed, falling back to client');
          }
        }
        
        // Fall back to perplexity client
        response = await perplexityClient.createChatCompletion(messages, {
          model,
          temperature: 0.7, // Research temperature 
          max_tokens: 4000  // Allow for comprehensive responses
        });
      }
      
      if (DEBUG) {
        debugInfo.events.push({
          timestamp: new Date().toISOString(),
          event: 'api_call_success',
          message: 'Perplexity API response received successfully',
          responseDetails: {
            id: response.id,
            model: response.model,
            created: response.created,
            tokenUsage: response.usage
          }
        });
        logDebug('API call succeeded!');
      }
      console.log(`Perplexity API response status: Success`);
      
      // Extract content from the response
      const content = response.choices?.[0]?.message?.content || '';
      console.log(`Extracted content length: ${content.length}`);
      
      // Parse the content to extract references
      const references = extractReferencesFromContent(content);
      console.log(`Extracted ${references.length} references`);
      
      // Remove the references section from the answer
      let answer = content;
      const referencesSectionIndex = content.toLowerCase().indexOf("references");
      if (referencesSectionIndex !== -1) {
        answer = content.substring(0, referencesSectionIndex).trim();
      }
      
      const result: ResearchResponse = {
        answer,
        references
      };
      
      if (DEBUG) result.debug = debugInfo;
      
      return result;
    } catch (apiError: unknown) {
      // Handle specific API errors
      if (DEBUG) {
        debugInfo.events.push({
          timestamp: new Date().toISOString(),
          event: 'api_error',
          message: 'Perplexity API call failed',
          error: apiError instanceof Error ? apiError.message : String(apiError),
          stack: apiError instanceof Error ? apiError.stack : undefined
        });
        logDebug('API error:', apiError);
      }
      console.error('Perplexity API call failed:', apiError);
      
      // If we're forcing real data and have an API key, don't fall back to simulation
      // unless we've tried multiple times
      if (forceReal && retryAttempt < 2) {
        if (DEBUG) {
          debugInfo.events.push({
            timestamp: new Date().toISOString(),
            event: 'force_retry',
            message: 'Force mode active, retrying API call'
          });
          logDebug('Force mode active, retrying');
        }
        console.log('Force mode active, retrying API call');
        return performPerplexityResearch(query, apiKey, model, retryAttempt + 1, forceReal);
      }
      
      // Retry once on network errors that might be temporary
      if (apiError instanceof Error && 
          (apiError.message.includes('network') || 
           apiError.message.includes('connection') || 
           apiError.message.includes('timeout') || 
           apiError.message.includes('ECONNREFUSED') ||
           apiError.message.includes('ETIMEDOUT')) && 
          retryAttempt === 0) {
        if (DEBUG) {
          debugInfo.events.push({
            timestamp: new Date().toISOString(),
            event: 'network_retry',
            message: 'Network error, retrying request...'
          });
          logDebug('Network error, retrying');
        }
        console.log('Network error, retrying request...');
        return performPerplexityResearch(query, apiKey, model, 1, forceReal);
      }
      
      let errorMessage = 'Unknown API error';
      if (apiError instanceof Error) {
        errorMessage = apiError.message;
      }
      
      // Return a simulated response with the error (only if we're not forcing real data)
      if (!forceReal || retryAttempt >= 2) {
        if (DEBUG) {
          debugInfo.events.push({
            timestamp: new Date().toISOString(),
            event: 'simulation_fallback',
            message: 'Falling back to simulation after API errors'
          });
          logDebug('Falling back to simulation');
        }
        console.log('Falling back to simulation after API errors');
        const errorResponse = simulatePerplexityResponse(query, model, errorMessage);
        errorResponse.error = errorMessage;
        errorResponse.errorDetails = apiError instanceof Error ? {
          name: apiError.name,
          message: apiError.message,
          stack: apiError.stack
        } : String(apiError);
        if (DEBUG) errorResponse.debug = debugInfo;
        return errorResponse;
      } else {
        // If forcing real data, throw the error to be handled by the caller
        throw apiError;
      }
    }
  } catch (error: unknown) {
    // Handle any unexpected errors
    if (DEBUG) {
      debugInfo.events.push({
        timestamp: new Date().toISOString(),
        event: 'unexpected_error',
        message: 'Unexpected error in Perplexity research',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      logDebug('Unexpected error:', error);
    }
    console.error('Unexpected error in Perplexity research:', error);
    
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    const simulated = simulatePerplexityResponse(query, model, errorMessage);
    simulated.error = errorMessage;
    simulated.errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : String(error);
    if (DEBUG) simulated.debug = debugInfo;
    return simulated;
  }
}

/**
 * Extracts references from the content returned by the Perplexity API
 */
function extractReferencesFromContent(content: string): Reference[] {
  const references: Reference[] = [];
  
  // Check if there's a "References" section
  const referencesMatch = content.match(/references:?(?:\s*\n)+([\s\S]+)/i);
  
  if (referencesMatch && referencesMatch[1]) {
    const referencesText = referencesMatch[1].trim();
    
    // Try to parse numbered references like "1. Title - snippet - url"
    const referenceLines = referencesText.split(/\n+/);
    
    for (const line of referenceLines) {
      // Skip empty lines
      if (!line.trim()) continue;
      
      // Match numbered references like "1. Title - snippet - url"
      const match = line.match(/^\d+\.\s+(.+?)(?:\s+-\s+|\s*\n\s*)(.+?)(?:\s+-\s+|\s*\n\s*)(\bhttps?:\/\/\S+)\b/i);
      
      if (match) {
        references.push({
          title: match[1].trim(),
          snippet: match[2].trim(),
          url: match[3].trim()
        });
        continue;
      }
      
      // If not matched, try to extract just the URL and use the text before it as title/snippet
      const urlMatch = line.match(/^(.*?)(\bhttps?:\/\/\S+)\b/i);
      
      if (urlMatch && urlMatch[2]) {
        const remainingText = urlMatch[1].trim();
        const splitIndex = Math.floor(remainingText.length / 2);
        
        references.push({
          title: remainingText.substring(0, splitIndex).trim() || "Reference",
          snippet: remainingText.substring(splitIndex).trim() || "No snippet available",
          url: urlMatch[2]
        });
      }
    }
  }
  
  // If no references were found using the structured approach, try a fallback regex pattern
  if (references.length === 0) {
    // Look for URLs in the content
    const urlRegex = /\bhttps?:\/\/\S+\b/gi;
    const urls = content.match(urlRegex) || [];
    
    // For each URL, extract surrounding text as title and snippet
    for (const url of urls) {
      // Find where the URL occurs in the content
      const urlIndex = content.indexOf(url);
      const surroundingText = content.substring(Math.max(0, urlIndex - 150), urlIndex).trim();
      
      // Use the last sentence fragment before the URL as the title
      const sentenceParts = surroundingText.split(/[.!?]\s+/);
      const title = sentenceParts.length > 0 
        ? sentenceParts[sentenceParts.length - 1] 
        : "Reference";
      
      references.push({
        title: title || "Reference",
        snippet: surroundingText || "No snippet available",
        url
      });
    }
  }
  
  return references;
}

/**
 * Simulates a response from the Perplexity API
 */
function simulatePerplexityResponse(
  query: string,
  model: string = 'simulation',
  errorReason?: string
): ResearchResponse & { simulated: true } {
  console.log(`Simulating Perplexity response for query: "${query}" with model: ${model}`);
  
  if (errorReason) {
    console.log(`Reason for simulation: ${errorReason}`);
  }
  
  // Ensure model is valid
  let actualModel = model;
  if (!VALID_PERPLEXITY_MODELS.includes(model) && model !== 'simulation') {
    actualModel = DEFAULT_MODEL;
  }
  
  // Capitalize first letter of query and remove trailing punctuation
  const cleanQuery = query.charAt(0).toUpperCase() + query.slice(1).replace(/[.,;:!?]$/, '');
  
  // Extract keywords from the query
  const keywords = query.toLowerCase()
    .split(/\s+/)
    .filter(word => 
      word.length > 3 && 
      !['what', 'when', 'where', 'why', 'how', 'the', 'and', 'that', 'this', 'with', 'from'].includes(word)
    );
  
  // Model-specific simulated answers
  let modelDescription = "";
  
  switch(actualModel) {
    case 'sonar-deep-research':
      modelDescription = "comprehensive research with deep analysis from multiple sources";
      break;
    case 'sonar-reasoning-pro':
    case 'sonar-reasoning':
      modelDescription = "detailed reasoning with comprehensive analysis";
      break;
    case 'sonar-pro':
      modelDescription = "professional-level information with high accuracy";
      break;
    case 'sonar':
      modelDescription = "general information and overview";
      break;
    case 'r1-1776':
      modelDescription = "balanced research with careful reasoning";
      break;
    default:
      modelDescription = "simulated research results";
  }
  
  // Build a simulated answer that acknowledges it's simulated but still useful
  const answer = `# ${cleanQuery}: Simulated Research Results

This is a simulated response providing ${modelDescription} for "${query}".
${errorReason ? `\n> Note: Simulation triggered due to error: ${errorReason}` : ''}

## Key Findings

Based on simulated web research, here are the key points about ${keywords[0] || 'this topic'}:

1. **Overview**: ${keywords[0] || 'This topic'} involves ${keywords[1] || 'various aspects'} that impact ${keywords[2] || 'multiple areas'}.

2. **Main Aspects**: Several sources highlight the importance of understanding ${keywords[0] || 'the subject'} in relation to ${keywords[1] || 'related concepts'}.

3. **Recent Developments**: Recent information suggests significant changes in how ${keywords[0] || 'this area'} is approached.

4. **Expert Perspectives**: Experts in the field have provided various viewpoints on ${keywords[0] || 'this topic'}, particularly regarding ${keywords[1] || 'key aspects'}.

## Analysis

The relationship between ${keywords[0] || 'primary elements'} and ${keywords[1] || 'secondary factors'} appears to be significant according to multiple sources. This connection suggests important implications for ${keywords[2] || 'relevant areas'}.

> Note: This is a simulated response. For accurate research results, please ensure your Perplexity API connection is working properly.`;

  // Create simulated references
  const references = [
    {
      title: `Understanding ${keywords[0] || 'Key Concepts'}: A Comprehensive Guide`,
      snippet: `This article explores the fundamental aspects of ${keywords[0] || 'the subject'} and provides a framework for analysis in modern contexts.`,
      url: `https://example.com/research/${keywords[0] || 'research'}-guide`
    },
    {
      title: `Recent Developments in ${keywords[1] || 'The Field'}: 2025 Overview`,
      snippet: `A systematic review of developments in ${keywords[1] || 'this area'} over the past year, highlighting breakthrough research and emerging trends.`,
      url: `https://example.com/developments/${keywords[1] || 'topic'}-recent-overview`
    },
    {
      title: `${keywords[2] || 'Applications'} in Practice: Case Studies`,
      snippet: `This article examines real-world implementations of ${keywords[2] || 'concepts'} across various industries, with detailed case studies and outcome measurements.`,
      url: `https://example.com/applications/${keywords[2] || 'practical'}-cases`
    }
  ];
  
  return { 
    answer, 
    references,
    simulated: true,
    error: errorReason
  };
}

export async function searchWithPerplexity(
  query: string,
  apiKey: string,
  model: string = "sonar-deep-research",
  forceReal: boolean = false
): Promise<{ answer: string; references: any[]; error?: string; simulated?: boolean }> {
  debug.log(`🔍 searchWithPerplexity called with model: ${model}, forceReal: ${forceReal}`);
  
  // If no API key is provided and we're not forcing real API calls, use simulated response
  if ((!apiKey || apiKey.trim() === "") && !forceReal) {
    debug.log("⚠️ No API key provided for Perplexity, using simulated response");
    return getSimulatedResponse(query);
  }

  try {
    debug.log(`📡 Calling Perplexity API with model: ${model}`);
    
    // Detailed logging of the request (without revealing the full API key)
    debug.log(`Request details:
      - URL: ${PERPLEXITY_API_URL}
      - Model: ${model}
      - API Key: ${apiKey ? apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 3) : "none"}
      - Query: ${query.substring(0, 100)}${query.length > 100 ? "..." : ""}
    `);

    const requestBody = {
      model: model,
      messages: [
        {
          role: "system",
          content: "You are a research assistant that provides comprehensive, factual, and up-to-date information. Format citations at the end as a numbered list with titles, snippets, and URLs."
        },
        {
          role: "user",
          content: `Research this topic thoroughly with citations: ${query}`
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      stream: false
    };

    // Make the API call
    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    // Log the response status
    debug.log(`Perplexity API response status: ${response.status} ${response.statusText}`);

    // If the response is not ok, throw an error
    if (!response.ok) {
      const errorText = await response.text();
      debug.error(`Perplexity API error (${response.status}):`, errorText);
      
      // Try to parse the error as JSON to get a more detailed error message
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          throw new Error(`API error (${response.status}): ${errorJson.error.message || errorJson.error}`);
        }
      } catch (e) {
        // If parsing fails, throw the original error text
      }
      
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    // Parse the response
    const data = await response.json() as PerplexityResponse;
    debug.log("Perplexity API response received successfully");

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid response format from Perplexity API");
    }

    // Process the response to extract answer and references
    const content = data.choices[0].message.content;
    
    // Simple extraction of references from the response
    // Looking for numbered references at the end of the text
    const references = [];
    const lines = content.split("\n");
    let inReferences = false;
    
    for (const line of lines) {
      // Check if this line starts a reference section
      if (line.match(/references|sources|citations/i) && !inReferences) {
        inReferences = true;
        continue;
      }
      
      // Check if this line contains a reference (starts with a number followed by a period)
      if (inReferences && line.match(/^\d+\./)) {
        // Try to extract title, snippet, and URL
        const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
        const url = urlMatch ? urlMatch[0] : "";
        
        // Remove the URL from the line to get the title/snippet
        let titleSnippet = line.replace(/(https?:\/\/[^\s]+)/, "").replace(/^\d+\./, "").trim();
        
        // Split into title and snippet if possible
        const parts = titleSnippet.split(" - ");
        const title = parts[0] || titleSnippet;
        const snippet = parts.length > 1 ? parts.slice(1).join(" - ") : "";
        
        references.push({
          title,
          snippet,
          url
        });
      }
    }
    
    // If no references were found using the method above, try another approach
    // Sometimes the model formats references differently
    if (references.length === 0) {
      const refMatch = content.match(/\[(\d+)\]\s+(.+?)(?=\s+\[\d+\]|\s*$)/g);
      if (refMatch) {
        refMatch.forEach(match => {
          const urlMatch = match.match(/(https?:\/\/[^\s]+)/);
          references.push({
            title: match.replace(/\[\d+\]\s+/, "").replace(/(https?:\/\/[^\s]+)/, "").trim(),
            snippet: "",
            url: urlMatch ? urlMatch[0] : ""
          });
        });
      }
    }
    
    // If still no references, make one final attempt with regex for numbered lists
    if (references.length === 0) {
      const numListMatch = content.match(/\d+\.\s+([\s\S]+?)(?=\d+\.\s+|$)/g);
      if (numListMatch && numListMatch.length > 0) {
        const lastFewMatches = numListMatch.slice(-Math.min(5, numListMatch.length));
        
        lastFewMatches.forEach(match => {
          const urlMatch = match.match(/(https?:\/\/[^\s]+)/);
          references.push({
            title: match.replace(/^\d+\.\s+/, "").replace(/(https?:\/\/[^\s]+)/, "").trim(),
            snippet: "",
            url: urlMatch ? urlMatch[0] : ""
          });
        });
      }
    }

    debug.log(`Extracted ${references.length} references from response`);
    
    return {
      answer: content,
      references: references,
      error: undefined,
      simulated: undefined
    };
  } catch (error) {
    debug.error("Perplexity API request failed:", error);
    
    // If we encounter an error and force real is false, fall back to simulated response
    if (!forceReal) {
      debug.log("⚠️ API call failed, falling back to simulated response");
      const simulatedResponse = getSimulatedResponse(query);
      return {
        ...simulatedResponse,
        error: `API Error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
    
    // If force real is true, propagate the error
    throw error;
  }
}

// Simulated response function for development/testing
function getSimulatedResponse(query: string) {
  debug.log("📝 Generating simulated Perplexity response");
  
  // Generate a response based on the query
  const topics = [
    "AI and machine learning",
    "climate change",
    "space exploration",
    "quantum computing",
    "renewable energy",
    "blockchain technology",
    "public health"
  ];
  
  const matchingTopic = topics.find(topic => query.toLowerCase().includes(topic.toLowerCase())) || 
                        topics[Math.floor(Math.random() * topics.length)];
  
  const responses = {
    "AI and machine learning": {
      answer: `# AI and Machine Learning Overview
      
Artificial Intelligence (AI) and machine learning are revolutionary technologies transforming industries worldwide. Machine learning, a subset of AI, uses algorithms to parse data, learn from it, and make informed decisions based on what it has learned.

## Key Concepts
1. **Supervised Learning**: Training models on labeled data
2. **Unsupervised Learning**: Finding patterns in unlabeled data
3. **Reinforcement Learning**: Learning through trial and error with rewards
4. **Deep Learning**: Using neural networks with multiple layers

Recent advancements include large language models like GPT-4, Claude, and Gemini, which can understand and generate human-like text, code, and even create images from descriptions.

## Industry Applications
- Healthcare: Disease diagnosis and drug discovery
- Finance: Fraud detection and algorithmic trading
- Transportation: Self-driving vehicles and route optimization
- Customer Service: Intelligent chatbots and recommendation systems

## Challenges and Ethical Considerations
Researchers and policymakers are actively addressing challenges including bias in AI systems, privacy concerns, and ensuring responsible development of increasingly powerful AI systems.`,
      references: [
        {
          title: "Machine Learning: An Overview - MIT Technology Review",
          snippet: "A comprehensive introduction to machine learning principles and applications",
          url: "https://www.technologyreview.com/machine-learning-overview"
        },
        {
          title: "The State of AI in 2023 - Stanford HAI",
          snippet: "Annual report on artificial intelligence developments and trends",
          url: "https://hai.stanford.edu/state-of-ai-2023"
        },
        {
          title: "Ethics of Artificial Intelligence - IEEE Spectrum",
          snippet: "Exploring the ethical dimensions of AI development and deployment",
          url: "https://spectrum.ieee.org/ethics-of-ai"
        }
      ]
    },
    "climate change": {
      answer: `# Climate Change: Current Understanding and Challenges
      
Climate change refers to long-term shifts in temperatures and weather patterns, primarily caused by human activities, especially the burning of fossil fuels which increases heat-trapping greenhouse gas levels in Earth's atmosphere.

## Key Indicators
1. **Rising Temperatures**: Global temperature has risen about 1.1°C since pre-industrial times
2. **Sea Level Rise**: Global sea level rose about 8-9 inches since 1880
3. **Extreme Weather Events**: Increased frequency and intensity of hurricanes, floods, and droughts
4. **Arctic Ice Loss**: The Arctic is warming twice as fast as the global average

## Impact on Ecosystems and Human Society
Climate change affects ecosystems worldwide, causing biodiversity loss, ocean acidification, and habitat destruction. Human communities face challenges including water scarcity, reduced agricultural yields, health impacts, and displacement due to extreme weather and sea level rise.

## Mitigation and Adaptation Strategies
- **Renewable Energy**: Transitioning from fossil fuels to solar, wind, and hydroelectric power
- **Energy Efficiency**: Reducing energy consumption in buildings, transportation, and industry
- **Carbon Capture**: Developing technologies to remove CO2 from the atmosphere
- **Policy Approaches**: Carbon pricing, regulations, and international agreements like the Paris Agreement

While the challenges are significant, rapid technological innovation and growing political will offer hope for effective climate action.`,
      references: [
        {
          title: "IPCC Sixth Assessment Report - Intergovernmental Panel on Climate Change",
          snippet: "Latest comprehensive assessment of climate change science",
          url: "https://www.ipcc.ch/assessment-report/ar6/"
        },
        {
          title: "Climate Change Indicators - US EPA",
          snippet: "Data on key indicators that track various aspects of climate change",
          url: "https://www.epa.gov/climate-indicators"
        },
        {
          title: "Renewable Energy Transitions - International Energy Agency",
          snippet: "Analysis of global shifts toward renewable energy sources",
          url: "https://www.iea.org/reports/renewable-energy-transitions"
        }
      ]
    },
    "default": {
      answer: `# Research on ${query}

I've gathered information about ${query} from multiple reliable sources. 

## Key Points
1. This topic involves several important aspects that are worth exploring in detail
2. There are varying perspectives on this subject across different fields
3. Recent developments have changed how we understand this area
4. Several practical applications exist in modern contexts

## Analysis
When examining ${query}, it's important to consider both the historical context and contemporary applications. Experts in this field generally agree on the fundamental principles, though there are ongoing debates about specific implementation details and future directions.

The most current research suggests that this area will continue to evolve rapidly in the coming years, with significant implications for related fields.`,
      references: [
        {
          title: `${query}: A Comprehensive Overview - Journal of Advanced Studies`,
          snippet: `Recent scholarly examination of ${query} and its implications across various domains`,
          url: `https://example.com/journal/${query.replace(/\s+/g, '-').toLowerCase()}`
        },
        {
          title: `The Future of ${query} - Technology Research Institute`,
          snippet: `Analysis of emerging trends and future directions related to ${query}`,
          url: `https://example.com/research/${query.replace(/\s+/g, '-').toLowerCase()}-future`
        },
        {
          title: `Understanding ${query}: Practical Applications - Educational Resource`,
          snippet: `Practical guide to implementing concepts related to ${query} in real-world settings`,
          url: `https://example.com/guide/${query.replace(/\s+/g, '-').toLowerCase()}`
        }
      ]
    }
  };

  // Return the matching response or a default one
  return responses[matchingTopic as keyof typeof responses] || responses.default;
} 
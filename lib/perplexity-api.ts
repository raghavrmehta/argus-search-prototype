/**
 * Perplexity API client for web research
 * Implementation with enhanced error handling and debugging
 */

import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
import { EventEmitter } from 'events';

// Constants and configuration
const DEBUG = true;
const API_TIMEOUT = 120000; // 2 minutes timeout

// Valid Perplexity models
const VALID_MODELS = [
  'sonar-deep-research',  // 128k context
  'sonar-reasoning-pro',  // 128k context
  'sonar-reasoning',      // 128k context
  'sonar-pro',            // 200k context
  'sonar',                // 128k context
  'r1-1776'               // 128k context
];

// Default model
const DEFAULT_MODEL = 'sonar-deep-research';

// Types for messages and roles
type Role = 'system' | 'user' | 'assistant';

interface Message {
  role: Role;
  content: string;
}

// Response types
interface ChatCompletionChoice { 
  index: number;
  message: Message;
  finish_reason: string;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Stream types
interface ChatCompletionChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: Role;
      content?: string;
    };
    finish_reason: string | null;
  }[];
}

// Request options
interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

// Event emitter for streaming
class StreamResponse extends EventEmitter {
  constructor() {
    super();
  }
}

function logDebug(...args: any[]) {
  if (DEBUG) {
    console.log('[Perplexity API Debug]', ...args);
  }
}

export class PerplexityAPI {
  private readonly BASE_URL = 'https://api.perplexity.ai';
  private api: AxiosInstance;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.PERPLEXITY_API_KEY;
    
    if (!key) {
      throw new Error(
        'API key must be provided either as an argument or as the PERPLEXITY_API_KEY environment variable.'
      );
    }

    logDebug('Initializing Perplexity API client');
    
    // Configure axios with better defaults
    const axiosConfig: AxiosRequestConfig = {
      baseURL: this.BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      timeout: API_TIMEOUT // Set a long timeout
    };
    
    // Create axios instance with error handlers
    this.api = axios.create(axiosConfig);
    
    // Log requests in debug mode
    this.api.interceptors.request.use(
      config => {
        logDebug(`Sending ${config.method?.toUpperCase()} request to ${config.url}`);
        return config;
      },
      error => {
        logDebug('Request error:', error);
        return Promise.reject(error);
      }
    );
    
    // Log responses in debug mode
    this.api.interceptors.response.use(
      response => {
        logDebug(`Received ${response.status} response from ${response.config.url}`);
        return response;
      },
      error => {
        if (error.response) {
          logDebug(`Error response: ${error.response.status}`, error.response.data);
        } else if (error.request) {
          logDebug('No response received', error.message);
        } else {
          logDebug('Request setup error', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Test connectivity to the Perplexity API
   * This method makes a simple HEAD request to the API to check if it's reachable
   */
  async testConnectivity(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      logDebug('Testing connectivity to Perplexity API...');
      
      // Try to hit the API root to see if we can connect at all
      const response = await axios.get(`${this.BASE_URL}/health`, {
        timeout: 10000, // 10 second timeout for the connectivity test
        headers: {
          'Accept': 'application/json'
        }
      });
      
      logDebug('Connectivity test successful', response.status);
      
      return {
        success: true,
        message: `Successfully connected to Perplexity API. Status: ${response.status}`
      };
    } catch (error) {
      logDebug('Connectivity test failed:', error);
      
      // Try an alternative connectivity test to the API endpoint
      try {
        const response = await axios.head(`${this.BASE_URL}/chat/completions`, {
          timeout: 10000,
          headers: {
            'Accept': 'application/json'
          }
        });
        
        logDebug('Alternative connectivity test successful', response.status);
        
        return {
          success: true,
          message: `Successfully connected to Perplexity API endpoint. Status: ${response.status}`
        };
      } catch (secondError) {
        logDebug('Alternative connectivity test also failed:', secondError);
      }
      
      let details: any = { message: 'Unknown error' };
      let message = 'Failed to connect to Perplexity API';
      
      if (axios.isAxiosError(error)) {
        details = {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
          code: error.code,
          isNetworkError: error.code === 'ECONNABORTED' || !error.response
        };
        
        if (error.code === 'ECONNABORTED') {
          message = 'Connection timed out. The server may be down or there may be network issues.';
        } else if (!error.response) {
          message = 'No response received. There may be network connectivity issues or DNS problems.';
        } else {
          message = `Server responded with error: ${error.response.status} ${error.response.statusText || ''}`;
        }
      } else if (error instanceof Error) {
        details = { errorName: error.name, message: error.message };
        message = `Error: ${error.message}`;
      }
      
      return {
        success: false,
        message,
        details
      };
    }
  }
  
  /**
   * Create a chat completion with Perplexity API
   */
  async createChatCompletion(
    messages: Message[],
    options: ChatCompletionOptions = {}
  ): Promise<ChatCompletionResponse> {
    // Use default model if none specified, or if specified model is invalid
    let modelToUse = options.model || DEFAULT_MODEL;
    
    // Validate the model
    if (!VALID_MODELS.includes(modelToUse)) {
      logDebug(`Invalid model specified: ${modelToUse}, using default: ${DEFAULT_MODEL}`);
      modelToUse = DEFAULT_MODEL;
    }
    
    const { temperature, max_tokens, top_p, stream = false } = options;

    if (stream) {
      throw new Error('For streaming responses, use createChatCompletionStream instead');
    }

    const payload = {
      model: modelToUse,
      messages,
      temperature,
      max_tokens,
      top_p,
      stream: false
    };

    logDebug('Creating chat completion', { model: modelToUse, messageCount: messages.length });
    
    try {
      const response: AxiosResponse<ChatCompletionResponse> = await this.api.post(
        '/chat/completions',
        payload
      );
      
      logDebug('Chat completion successful', { 
        model: response.data.model,
        tokensUsed: response.data.usage?.total_tokens
      });
      
      return response.data;
    } catch (error) {
      console.error('Perplexity API Error:', error);
      
      if (axios.isAxiosError(error)) {
        // Log detailed information about the error
        console.error('Axios Error Details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          message: error.message,
          code: error.code
        });
        
        // Create a more descriptive error message
        let errorMessage = error.message || 'Unknown error';
        
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          errorMessage = `Server error: ${error.response.status} - ${error.response.statusText || 'Unknown status'}`;
          
          if (error.response.data) {
            if (typeof error.response.data === 'object' && error.response.data !== null) {
              errorMessage += ` - ${JSON.stringify(error.response.data)}`;
            } else if (typeof error.response.data === 'string') {
              errorMessage += ` - ${error.response.data}`;
            }
          }
        } else if (error.request) {
          // The request was made but no response was received
          errorMessage = 'No response received from server. This could be due to network issues or the server being unavailable.';
        }
        
        // Try with lower-level fetch API as a fallback
        try {
          logDebug('Attempting fallback with fetch API');
          const fetchResult = await this.fallbackFetch(payload);
          return fetchResult;
        } catch (fetchError) {
          logDebug('Fetch fallback also failed:', fetchError);
          throw new Error(`Perplexity API Error: ${errorMessage}`);
        }
      }
      
      // Re-throw any non-Axios errors with more context
      throw new Error(`Unexpected error when calling Perplexity API: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Fallback method using native fetch API
   * Used when axios encounters issues
   */
  private async fallbackFetch(payload: any): Promise<ChatCompletionResponse> {
    logDebug('Using fetch fallback for API call');
    
    const response = await fetch(`${this.BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.api.defaults.headers.common['Authorization']}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fetch API error: ${response.status} - ${errorText}`);
    }
    
    return await response.json();
  }

  /**
   * Create a streaming chat completion
   */
  createChatCompletionStream(
    messages: Message[],
    options: ChatCompletionOptions = {}
  ): StreamResponse {
    // Use default model if none specified, or if specified model is invalid
    let modelToUse = options.model || DEFAULT_MODEL;
    
    // Validate the model
    if (!VALID_MODELS.includes(modelToUse)) {
      logDebug(`Invalid model specified: ${modelToUse}, using default: ${DEFAULT_MODEL}`);
      modelToUse = DEFAULT_MODEL;
    }
    
    const { temperature, max_tokens, top_p } = options;
    const streamResponse = new StreamResponse();

    const payload = {
      model: modelToUse,
      messages,
      temperature,
      max_tokens,
      top_p,
      stream: true
    };

    logDebug('Creating streaming chat completion', { model: modelToUse, messageCount: messages.length });
    
    // Create request with responseType: 'stream'
    this.api.post('/chat/completions', payload, {
      responseType: 'stream'
    }).then(response => {
      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              streamResponse.emit('done');
              continue;
            }
            
            try {
              const parsedData: ChatCompletionChunk = JSON.parse(data);
              streamResponse.emit('data', parsedData);
            } catch (error) {
              streamResponse.emit('error', new Error(`Error parsing stream data: ${error}`));
            }
          }
        }
      });

      response.data.on('end', () => {
        streamResponse.emit('end');
      });
    }).catch(error => {
      console.error('Perplexity API Streaming Error:', error);
      
      if (axios.isAxiosError(error)) {
        // Log detailed information about the error
        console.error('Axios Streaming Error Details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          message: error.message,
          code: error.code
        });
        
        // Create a more descriptive error message
        let errorMessage = error.message || 'Unknown error';
        
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          errorMessage = `Server error: ${error.response.status} - ${error.response.statusText || 'Unknown status'}`;
          
          if (error.response.data) {
            if (typeof error.response.data === 'object' && error.response.data !== null) {
              errorMessage += ` - ${JSON.stringify(error.response.data)}`;
            } else if (typeof error.response.data === 'string') {
              errorMessage += ` - ${error.response.data}`;
            }
          }
        } else if (error.request) {
          // The request was made but no response was received
          errorMessage = 'No response received from server. This could be due to network issues or the server being unavailable.';
        }
        
        streamResponse.emit('error', new Error(`Perplexity API Error: ${errorMessage}`));
      } else {
        // Handle any non-Axios errors
        streamResponse.emit('error', new Error(`Unexpected error when streaming from Perplexity API: ${error instanceof Error ? error.message : String(error)}`));
      }
    });

    return streamResponse;
  }
}

// OpenAI-compatible client implementation
export class OpenAICompatClient {
  private client: PerplexityAPI;

  constructor(apiKey?: string, baseUrl: string = 'https://api.perplexity.ai') {
    this.client = new PerplexityAPI(apiKey);
  }

  chat = {
    completions: {
      create: async (params: {
        model: string;
        messages: Message[];
        temperature?: number;
        max_tokens?: number;
        top_p?: number;
        stream?: boolean;
      }) => {
        const { stream = false, ...rest } = params;
        
        // Ensure we use a valid model
        const modelToUse = params.model && VALID_MODELS.includes(params.model) 
          ? params.model 
          : DEFAULT_MODEL;
        
        if (stream) {
          const streamResponse = this.client.createChatCompletionStream(params.messages, {
            model: modelToUse,
            temperature: params.temperature,
            max_tokens: params.max_tokens,
            top_p: params.top_p,
            stream: true
          });
          
          // Convert to an AsyncIterable to match OpenAI's client behavior
          return {
            [Symbol.asyncIterator]: async function* () {
              return new Promise((resolve, reject) => {
                streamResponse.on('data', (chunk) => {
                  resolve(chunk);
                });
                
                streamResponse.on('error', (error) => {
                  reject(error);
                });
                
                streamResponse.on('end', () => {
                  resolve(null); // End of stream
                });
              });
            }
          };
        }
        
        return this.client.createChatCompletion(params.messages, {
          model: modelToUse,
          temperature: params.temperature,
          max_tokens: params.max_tokens,
          top_p: params.top_p
        });
      }
    }
  }
}

// Export types for use in other files
export type { Message, Role, ChatCompletionResponse, ChatCompletionOptions }; 
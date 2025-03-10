"use client"

import { useState, useEffect } from "react"
import {
  Search,
  FileText,
  Database,
  Brain,
  RefreshCw,
  Save,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  ExternalLink,
  FileImage,
  Layers,
  Cpu,
  Settings,
  Loader2,
  FastForward,
  Globe,
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"

const PERPLEXITY_MODELS = [
  { value: "sonar-deep-research", label: "Sonar Deep Research (128k)" },
  { value: "sonar-reasoning-pro", label: "Sonar Reasoning Pro (128k)" },
  { value: "sonar-reasoning", label: "Sonar Reasoning (128k)" },
  { value: "sonar-pro", label: "Sonar Pro (200k)" },
  { value: "sonar", label: "Sonar (128k)" },
  { value: "r1-1776", label: "r1-1776 (128k)" }
];

// Add this after the DEFAULT_PERPLEXITY_MODEL constant
const SYNTHESIS_MODELS = [
  { value: "claude", label: "Claude 3.7 Sonnet" },
  { value: "gemini", label: "Gemini 1.5 Pro" }
];

// Add a debug log function
const debug = (...args: any[]) => {
  if (typeof window !== 'undefined') {
    console.log('[Argus Debug]', ...args);
  }
};

// Add a default model constant to make the code more maintainable
const DEFAULT_PERPLEXITY_MODEL = "sonar-deep-research";

export default function MacRagSearch() {
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any>(null)
  const [searchStage, setSearchStage] = useState<string | null>(null)
  const [savedSearches, setSavedSearches] = useState<Array<{ id: string; query: string; result: any }>>([])
  const [requireApproval, setRequireApproval] = useState(false)
  const [awaitingApproval, setAwaitingApproval] = useState(false)
  const [enableOCR, setEnableOCR] = useState(true)
  const [selectedModel, setSelectedModel] = useState("claude")
  const [perplexityModel, setPerplexityModel] = useState(DEFAULT_PERPLEXITY_MODEL);
  const [reasoningSteps, setReasoningSteps] = useState<
    Array<{ id: string; title: string; content: string; type: string; expanded: boolean }>
  >([])
  const [ocrResults, setOcrResults] = useState<Array<{ id: string; filename: string; content: string }>>([])
  const [spotlightFiles, setSpotlightFiles] = useState<Array<{ path: string; name: string; type: string; lastUsed: string }>>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [fileContents, setFileContents] = useState<Record<string, string>>({})
  const [spotlightStatus, setSpotlightStatus] = useState<'checking' | 'available' | 'unavailable' | 'error'>('checking')
  const [spotlightError, setSpotlightError] = useState<string | null>(null)
  const [showPermissionsGuide, setShowPermissionsGuide] = useState(false)
  const [searchPaused, setSearchPaused] = useState(false)
  const [searchContext, setSearchContext] = useState<{
    query: string;
    localContext?: string;
    webResearch?: string;
  } | null>(null)
  const [apiKeys, setApiKeys] = useState<{
    perplexity: string;
    anthropic: string;
    gemini: string;
  }>({
    perplexity: '',
    anthropic: '',
    gemini: ''
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [perplexityStatus, setPerplexityStatus] = useState<{
    status: 'idle' | 'connecting' | 'success' | 'error' | 'skipped';
    message: string;
  }>({
    status: 'idle',
    message: '',
  });
  const [forceRealApi, setForceRealApi] = useState(false);
  const [webResearchRequestTime, setWebResearchRequestTime] = useState('');
  const [spotlightDir, setSpotlightDir] = useState('');
  const [showPerplexityKey, setShowPerplexityKey] = useState(false);
  const [perplexityApiError, setPerplexityApiError] = useState<string | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Check Spotlight availability when component mounts
  useEffect(() => {
    const checkSpotlight = async () => {
      try {
        const response = await fetch('/api/spotlight-check');
        const data = await response.json();
        
        if (data && data.available) {
          setSpotlightStatus('available');
        } else {
          setSpotlightStatus('unavailable');
          setSpotlightError('Spotlight may require permissions');
          
          // Show permissions guide
          setShowPermissionsGuide(true);
        }
      } catch (error) {
        setSpotlightStatus('error');
        setSpotlightError('Error checking Spotlight');
        console.error('Error checking Spotlight:', error);
      }
    };
    
    checkSpotlight();
  }, []);

  // useEffect to load settings from localStorage on component mount
  useEffect(() => {
    try {
      // Load API keys
      const savedApiKeys = localStorage.getItem('argus-api-keys');
      if (savedApiKeys) {
        const parsedKeys = JSON.parse(savedApiKeys);
        debug('Loaded API keys from localStorage:', {
          perplexityLength: parsedKeys.perplexity?.length,
          perplexityPrefix: parsedKeys.perplexity?.substring(0, 5) + '...',
        });
        setApiKeys(parsedKeys);
      }
      
      // Load settings
      const savedSettings = localStorage.getItem('argus-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.requireApproval !== undefined) setRequireApproval(parsed.requireApproval);
        if (parsed.enableOCR !== undefined) setEnableOCR(parsed.enableOCR);
        if (parsed.selectedModel) setSelectedModel(parsed.selectedModel);
        if (parsed.perplexityModel) setPerplexityModel(parsed.perplexityModel);
      }
    } catch (e) {
      console.error('Error loading saved data:', e);
      debug('Error loading stored data:', e);
    }
  }, []);
  
  // useEffect to save settings when they change
  useEffect(() => {
    try {
      localStorage.setItem('argus-api-keys', JSON.stringify(apiKeys));
      localStorage.setItem('argus-settings', JSON.stringify({
        requireApproval,
        enableOCR,
        selectedModel,
        perplexityModel
      }));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  }, [apiKeys, requireApproval, enableOCR, selectedModel, perplexityModel]);

  // Add this after the useEffect that loads apiKeys from localStorage
  useEffect(() => {
    // Load perplexityModel from localStorage
    const savedModel = localStorage.getItem('perplexityModel');
    if (savedModel) {
      setPerplexityModel(savedModel);
    }
    
    // Load forceRealApi from localStorage
    const savedForceRealApi = localStorage.getItem('forceRealApi');
    if (savedForceRealApi) {
      setForceRealApi(savedForceRealApi === 'true');
    }
    
    // Load spotlight directory from localStorage
    const savedSpotlightDir = localStorage.getItem('spotlightDir');
    if (savedSpotlightDir) {
      setSpotlightDir(savedSpotlightDir);
    }
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    setSearchResults(null)
    setReasoningSteps([])
    setOcrResults([])
    setAwaitingApproval(false)
    setSpotlightFiles([])
    setSelectedFiles([])
    setFileContents({})
    setSearchPaused(false)
    setSearchContext(null)
    setPerplexityStatus({
      status: 'idle',
      message: '',
    })

    try {
      // Start both searches in parallel
      setSearchStage("spotlight")
      
      // Add reasoning step for Spotlight query
      addReasoningStep(
        "spotlight-query",
        "Spotlight Query Formation",
        `Formulating search query "${query}" for macOS Spotlight API to find relevant local files.`,
        "process",
      )

      // Start Perplexity research in parallel
      startPerplexityResearch(query)
      
      // Attempt real Spotlight search
      try {
        console.log(`Searching for: ${query}`);
        
        const response = await fetch(`/api/spotlight?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (response.ok && data.results && data.results.length > 0) {
          setSpotlightFiles(data.results);
          console.log(`Found ${data.results.length} Spotlight results`);
          
          // Add reasoning step for results
          addReasoningStep(
            "spotlight-results",
            "Spotlight Search Results",
            `Found ${data.results.length} files on your Mac matching "${query}".
            
            ${data.priorityCount ? `${data.priorityCount} priority document types identified.` : ''}
            
            Please select files from the results to include in the analysis.`,
            "result",
          )
          
          // Pause search flow here to let user select files
          setSearchPaused(true);
          setSearchContext({ query });
          setSearchStage("selection");
          
          // Early return - will continue later when user clicks "Continue"
          return;
        } else {
          // Handle error or empty results from spotlight search
          addReasoningStep(
            "spotlight-results",
            "Spotlight Search Results",
            `No files found on your Mac matching "${query}".
            
            Will proceed with web research only.`,
            "result",
          )
          
          // Continue directly with the rest of the pipeline
          await continueSearch(query);
        }
      } catch (error) {
        // Handle network errors
        console.error("Network error in Spotlight search:", error);
        addReasoningStep(
          "spotlight-results",
          "Spotlight Search Error",
          `Error searching files on your Mac: ${error instanceof Error ? error.message : 'Unknown error'}.
          
          Will proceed with web research only.`,
          "result",
        )
        
        // Continue directly with the rest of the pipeline
        await continueSearch(query);
      }
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      if (!requireApproval || !awaitingApproval) {
        setIsSearching(false)
      }
    }
  }
  
  // Add this function to try direct API access as a last resort
  const tryDirectPerplexityApi = async (query: string, apiKey: string, model: string) => {
    console.log(`[DEBUG] Attempting direct Perplexity API call with model: ${model}`)
    try {
      // Clear any previous errors
      setPerplexityApiError(null);

      // Log the request details (excluding sensitive API key)
      console.log(`[DEBUG] Perplexity request: 
        - URL: https://api.perplexity.ai/chat/completions
        - Model: ${model}
        - Query: ${query}
      `);

      // Show that we're making the API call
      setPerplexityStatus({
        status: "connecting",
        message: "Connecting to Perplexity API directly...",
      });

      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json", 
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are a helpful AI assistant." },
            { role: "user", content: query },
          ],
        }),
      });

      // Log the response status
      console.log(`[DEBUG] Perplexity API response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        // Get the error text and log it
        const errorText = await response.text();
        console.error(`[DEBUG] Perplexity API error (${response.status}):`, errorText);
        
        let errorMessage = `API Error (${response.status})`;
        
        // Try to parse the error response if it's JSON
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            errorMessage = `${errorMessage}: ${errorJson.error.message || errorJson.error}`;
          }
        } catch (e) {
          // If not JSON, use the raw error text
          errorMessage = `${errorMessage}: ${errorText.substring(0, 100)}${errorText.length > 100 ? '...' : ''}`;
        }
        
        setPerplexityApiError(errorMessage);
        setPerplexityStatus({
          status: "error",
          message: errorMessage,
        });

        return null;
      }

      // Parse the response
      const data = await response.json();
      console.log("[DEBUG] Perplexity API success, response data:", data);

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        const errorMessage = "Invalid response format from Perplexity API";
        console.error("[DEBUG]", errorMessage, data);
        setPerplexityApiError(errorMessage);
        setPerplexityStatus({
          status: "error",
          message: errorMessage,
        });
        return null;
      }

      const content = data.choices[0].message.content;
      
      setPerplexityStatus({
        status: "success",
        message: "Perplexity API response received successfully!",
      });
      
      return content;
    } catch (error) {
      // Handle network errors or any other exceptions
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[DEBUG] Perplexity API request failed:", errorMessage);
      
      setPerplexityApiError(`Request failed: ${errorMessage}`);
      setPerplexityStatus({
        status: "error",
        message: `Connection error: ${errorMessage}`,
      });
      return null;
    }
  };

  // Update the startPerplexityResearch function
  const startPerplexityResearch = async (searchQuery: string) => {
    try {
      // Reset previous states
      setPerplexityStatus({
        status: 'connecting',
        message: 'Starting web research...'
      });
      setPerplexityApiError(null);
      setSearchStage('perplexity');
      
      // Pause the search so user can see what's happening
      setSearchPaused(true);
      
      // Log the start of web research
      console.log(`[DEBUG] Starting web research for: "${searchQuery}"`);
      console.log(`[DEBUG] Using model: ${perplexityModel}`);
      console.log(`[DEBUG] API key present: ${Boolean(apiKeys.perplexity)}`);
      console.log(`[DEBUG] Force real API: ${forceRealApi}`);
      
      // Record the request time
      setWebResearchRequestTime(new Date().toISOString());
      
      // Try our regular API route first
      const requestBody = {
        query: searchQuery,
        apiKey: apiKeys.perplexity,
        model: perplexityModel,
        forceReal: forceRealApi // Pass the forceReal flag
      };
      
      console.log('[DEBUG] Trying research API route...');
      
      // Make the API call
      let routeSuccess = false;
      let researchData;
      let errorFromRoute;
      
      try {
        // Update status
        setPerplexityStatus({
          status: 'connecting',
          message: 'Connecting to research API...'
        });
        
        const researchResponse = await fetch('/api/research', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        // Check if the response is ok
        if (!researchResponse.ok) {
          const error = await researchResponse.text();
          console.error(`[DEBUG] Web research request failed: ${error}`);
          errorFromRoute = error;
          
          // Try to parse JSON error if possible
          try {
            const jsonError = JSON.parse(error);
            if (jsonError.error) {
              errorFromRoute = jsonError.error;
            }
          } catch (e) {
            // Use text error if not JSON
          }
          
          setPerplexityApiError(`API route error: ${errorFromRoute}`);
          setPerplexityStatus({
            status: 'error',
            message: `API route error: ${errorFromRoute.substring(0, 50)}${errorFromRoute.length > 50 ? '...' : ''}`
          });
        } else {
          // Parse the response
          researchData = await researchResponse.json();
          console.log('[DEBUG] API route success:', researchData);
          routeSuccess = true;
          
          setPerplexityStatus({
            status: 'success',
            message: 'Research API request succeeded'
          });
        }
      } catch (routeError) {
        console.error('[DEBUG] Error calling research API route:', routeError);
        errorFromRoute = routeError instanceof Error ? routeError.message : String(routeError);
        
        setPerplexityApiError(`API route error: ${errorFromRoute}`);
        setPerplexityStatus({
          status: 'error',
          message: `API route error: ${errorFromRoute}`
        });
      }
      
      // If API route failed and we have an API key, try direct API access as last resort
      if (!routeSuccess && apiKeys.perplexity && forceRealApi) {
        console.log('[DEBUG] API route failed, attempting direct Perplexity API call...');
        
        // Update status
        setPerplexityStatus({
          status: 'connecting',
          message: 'Trying direct API connection...'
        });
        
        const directResult = await tryDirectPerplexityApi(
          searchQuery, 
          apiKeys.perplexity, 
          perplexityModel
        );
        
        if (directResult) {
          console.log('[DEBUG] Direct API call succeeded where API route failed!');
          
          // Format the response to match expected structure
          researchData = {
            answer: directResult,
            references: [],
            directApiSuccess: true
          };
          
          routeSuccess = true;
          
          setPerplexityStatus({
            status: 'success',
            message: 'Direct API request succeeded'
          });
        } else {
          console.error('[DEBUG] Both API route and direct API call failed');
          
          // Show error in reasoning steps
          addReasoningStep(
            "perplexity-error",
            "Web Research Error",
            `Error performing web research via API route: ${errorFromRoute}
            
            Direct API error: ${perplexityApiError || 'Connection failed'}
            
            Will proceed with local context only.`,
            "process"
          );
          
          setPerplexityStatus({
            status: 'error', 
            message: 'Both API methods failed'
          });
          
          return continueSearch(searchQuery);
        }
      } else if (!routeSuccess) {
        // Show error and proceed with local context
        addReasoningStep(
          "perplexity-error",
          "Web Research Error",
          `Error performing web research: ${errorFromRoute}.
          
          Will proceed with local context only.`,
          "process"
        );
        
        return continueSearch(searchQuery);
      }
      
      // At this point we have valid researchData one way or another
      
      // Even if we got a simulated response with an error, we'll use it
      // but still show the error in the reasoning steps
      if (researchData.error) {
        console.warn('[DEBUG] Web research returned with error:', researchData.error);
        
        // Add reasoning step for the error
        addReasoningStep(
          "perplexity-error",
          "Web Research Warning",
          `Web research encountered an issue: ${researchData.error}
            
            Using available results to continue.`,
          "result"
        );
        
        setPerplexityStatus({
          status: 'error',
          message: `API returned error: ${researchData.error}`
        });
      } else if (researchData.simulated) {
        // Add special step for simulated responses
        addReasoningStep(
          "perplexity-simulated",
          "Simulated Web Research",
          `Using simulated web research results since real-time web access is not available.
            
            These results are for demonstration purposes only.`,
          "process"
        );
        
        setPerplexityStatus({
          status: 'success',
          message: 'Using simulated research data'
        });
      } else {
        setPerplexityStatus({
          status: 'success',
          message: 'Web research completed successfully'
        });
      }
      
      // Format the web research for the model
      const webResearch = `
# Web Research Results

${researchData.answer || ''}

## References
${researchData.references && researchData.references.length > 0
? researchData.references.map((ref: any, i: number) =>
    `${i + 1}. ${ref.title}\n   ${ref.snippet}\n   URL: ${ref.url}`).join('\n\n')
: 'No references available.'}\n`;
      
      // Add reasoning step for research results
      addReasoningStep(
        "perplexity-synthesis",
        researchData.simulated ? "Simulated Research Results" : "Web Research Synthesis",
        `${researchData.simulated ? 'Generated simulated' : 'Completed'} web research for "${searchQuery}".
          
          ${researchData.references && researchData.references.length > 0
            ? `Gathered information from ${researchData.references.length} ${researchData.simulated ? 'simulated' : 'online'} sources.`
            : 'No references were found for this query.'}
          
          ${researchData.directApiSuccess ? '⚠️ Used direct API connection after API route failed.' : ''}`,
        "result"
      );
      
      // Store the web research results in the search context
      setSearchContext(prevContext => ({
        ...prevContext,
        query: searchQuery,
        webResearch: webResearch
      }));
      
      // Continue the search with the web research results
      return continueSearch(searchQuery);
    } catch (error) {
      console.error('[DEBUG] Error performing web research:', error);
      
      setPerplexityApiError(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      setPerplexityStatus({
        status: 'error',
        message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
      });
      
      addReasoningStep(
        "perplexity-synthesis",
        "Web Research Error",
        `Error performing web research: ${error instanceof Error ? error.message : 'Unknown error'}.
          
          Will proceed with local context only.`,
        "process"
      );
      
      return continueSearch(searchQuery);
    }
  };

  // Add function to skip Perplexity research
  const skipPerplexityResearch = () => {
    if (perplexityStatus.status === 'connecting') {
      setPerplexityStatus({
        status: 'skipped',
        message: 'Skipping web research',
      });
      
      // Add reasoning step for skipped research
      addReasoningStep(
        "perplexity-skipped",
        "Web Research Skipped",
        `Web research was skipped by user request.
        
        Will proceed with local context only.`,
        "result",
      )
      
      // If we're in the perplexity stage and waiting, continue to next stage
      if (searchStage === "perplexity" && !searchPaused) {
        // Continue with synthesis using whatever we have
        const localContext = searchContext?.localContext || "";
        synthesizeResults(query, localContext, "");
      }
    }
  }

  // New function to continue search after file selection
  const continueSearch = async (searchQuery: string) => {
    if (!searchQuery) {
      console.error("No search query provided");
      return;
    }

    setIsSearching(true);
    setSearchPaused(false);

    try {
      // Stage 2: OCR Processing (if enabled)
      if (enableOCR) {
        setSearchStage("ocr")
        await simulateProcess(1500)

        // This section is still simulated as we haven't implemented real OCR yet
        // ... existing OCR simulation code ...
      }

      // Stage 3: RAG Processing
      setSearchStage("rag")
      
      // Add reasoning step for RAG
      addReasoningStep(
        "rag-processing",
        "Local Document Processing",
        `Processing ${selectedFiles.length} selected local files for retrieval augmented generation.`,
        "process",
      )
      
      let localContext = "";
      
      // Only proceed with RAG if files are selected
      if (selectedFiles.length > 0) {
        try {
          // Call our RAG API
          const ragResponse = await fetch('/api/rag', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: searchQuery,
              filePaths: selectedFiles,
            }),
          });
          
          if (!ragResponse.ok) {
            throw new Error('RAG processing failed');
          }
          
          const ragData = await ragResponse.json();
          localContext = ragData.context || "";
          
          // Add reasoning step for retrieval
          addReasoningStep(
            "rag-retrieval",
            "Context Retrieval",
            `Successfully processed ${ragData.files?.processed || 0} content chunks from local files.
            
            Created local context with information relevant to "${searchQuery}" from your selected files.`,
            "result",
          )
          
          // Store local context in search context
          setSearchContext(prevContext => ({
            ...prevContext,
            query: searchQuery,
            localContext: localContext
          }));
        } catch (error) {
          console.error("RAG processing error:", error);
          
          // Add reasoning step for error
          addReasoningStep(
            "rag-retrieval",
            "Context Retrieval Error",
            `Error processing local files: ${error instanceof Error ? error.message : 'Unknown error'}.
            
            Will proceed with web research only.`,
            "result",
          )
        }
      } else {
        // Add reasoning step for no files
        addReasoningStep(
          "rag-retrieval",
          "Context Retrieval",
          `No local files were selected for processing.
          
          Will proceed with web research only.`,
          "result",
        )
      }

      // Stage 4: Check on Perplexity Research Status
      setSearchStage("perplexity")
      
      // Wait for Perplexity research to complete or let user skip
      if (perplexityStatus.status === 'connecting') {
        // Add reasoning step for waiting
        addReasoningStep(
          "perplexity-waiting",
          "Waiting for Web Research",
          `Web research is still in progress.
          
          You can wait for it to complete or skip to proceed with local context only.`,
          "process",
        )
        
        // Pause search flow here to wait for Perplexity or let user skip
        setSearchPaused(true);
        return;
      }
      
      // If Perplexity is complete or failed, continue with synthesis
      const webResearch = searchContext?.webResearch || "";
      
      // Check if approval is required
      if (requireApproval) {
        setSearchStage("approval")
        setAwaitingApproval(true)
        return
      }

      // Continue with final synthesis
      await synthesizeResults(searchQuery, localContext, webResearch)
    } catch (error) {
      console.error("Continuing search error:", error)
    } finally {
      if (!requireApproval || !awaitingApproval) {
        setIsSearching(false)
      }
    }
  }

  // Fix 'debug' references in the synthesizeResults function by using the local 'debug' function
  // Renamed continueSynthesis to synthesizeResults for clarity
  const synthesizeResults = async (searchQuery: string, localContext = "", webResearch = "") => {
    setAwaitingApproval(false)
    setIsSearching(true)

    // Stage 5: Final Model Synthesis (Claude or Gemini)
    setSearchStage(selectedModel)
    
    // Log synthesis details
    debug(`Starting synthesis with ${selectedModel} model:`, {
      modelValue: selectedModel,
      apiKeyPresent: selectedModel === "claude" 
        ? Boolean(apiKeys.anthropic) 
        : Boolean(apiKeys.gemini),
      apiKeyLength: selectedModel === "claude" 
        ? apiKeys.anthropic?.length 
        : apiKeys.gemini?.length
    });
    
    // Add reasoning step for synthesis
    addReasoningStep(
      `${selectedModel}-preparation`,
      `${selectedModel === "claude" ? "Claude" : "Gemini"} Context Preparation`,
      `Preparing gathered information for final synthesis using ${selectedModel === "claude" ? "Claude 3.7 Sonnet" : "Gemini 1.5 Pro"}.`,
      "process",
    )
    
    try {
      // Select the appropriate API key based on the model
      const apiKey = selectedModel === "claude" ? apiKeys.anthropic : apiKeys.gemini;
      
      if (!apiKey) {
        debug(`No API key available for ${selectedModel} model`);
        throw new Error(`No API key provided for ${selectedModel === "claude" ? "Claude" : "Gemini"}. Please add your API key in settings.`);
      }
      
      // Call our synthesis API with the correct API key
      debug(`Calling synthesis API with ${selectedModel} model`);
      const synthesisResponse = await fetch('/api/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          localContext,
          webResearch,
          apiKey,
          model: selectedModel,
        }),
      });

      if (!synthesisResponse.ok) {
        const errorText = await synthesisResponse.text();
        debug(`Synthesis API error (${synthesisResponse.status}):`, errorText);
        
        try {
          // Try to parse the error as JSON
          const errorJson = JSON.parse(errorText);
          throw new Error(`Synthesis error: ${errorJson.error || `API error (${synthesisResponse.status})`}`);
        } catch (e) {
          // If parsing fails, throw the original error text
          throw new Error(`Synthesis error: API error (${synthesisResponse.status}) - ${errorText}`);
        }
      }

      const synthesisResult = await synthesisResponse.json();
      
      if (synthesisResult.error) {
        debug('Synthesis returned with error:', synthesisResult.error);
        throw new Error(`Synthesis error: ${synthesisResult.error}`);
      }
      
      debug('Synthesis completed successfully:', {
        contentLength: synthesisResult.content?.length,
        model: synthesisResult.model,
        error: synthesisResult.error
      });

      // Display the synthesis results
      addReasoningStep(
        `${selectedModel}-synthesis`,
        `${selectedModel === "claude" ? "Claude" : "Gemini"} Output`,
        synthesisResult.content,
        "answer",
      );

      // Update search results
      setSearchResults({
        query: searchQuery,
        answer: synthesisResult.content,
        context: localContext,
        webResearch,
        timestamp: new Date().toISOString(),
      });

      // Complete the search process
      setIsSearching(false);
      return synthesisResult.content;
    } catch (error) {
      console.error("Synthesis error:", error);
      debug('Synthesis error:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Add error step
      addReasoningStep(
        `${selectedModel}-error`,
        `${selectedModel === "claude" ? "Claude" : "Gemini"} Synthesis Error`,
        `Error during synthesis: ${errorMessage}\n\nPlease check your API key in settings and try again.`,
        "process",
      );

      // Complete the search process with error
      setIsSearching(false);
      return null;
    }
  };

  // Simple markdown to HTML converter
  function markdownToHtml(markdown: string): string {
    if (!markdown) return '';
    
    // Convert headings
    let html = markdown
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gm, '<h4>$1</h4>');
      
    // Convert bold and italic
    html = html
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
      
    // Convert lists
    html = html
      .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
      .replace(/^- (.*$)/gm, '<li>$1</li>');
      
    // Wrap lists
    html = html
      .replace(/(<li>.*<\/li>\n)+/g, '<ol>$&</ol>')
      .replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>');
      
    // Convert paragraphs
    html = html
      .replace(/^(?!<[oh]|<li|<p)(.+)/gm, '<p>$1</p>');
      
    // Convert links
    html = html
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
      
    // Fix newlines
    html = html.replace(/\n/g, '');
    
    return html;
  }

  const simulateProcess = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const addReasoningStep = (id: string, title: string, content: string, type: string) => {
    setReasoningSteps((prev) => [
      ...prev,
      {
        id,
        title,
        content,
        type,
        expanded: false,
      },
    ])
  }

  const toggleReasoningStep = (id: string) => {
    setReasoningSteps((prev) => prev.map((step) => (step.id === id ? { ...step, expanded: !step.expanded } : step)))
  }

  const saveSearch = () => {
    if (!searchResults) return;

    // Create a record of selected local files
    const localFiles = selectedFiles.map(path => {
      const file = spotlightFiles.find(f => f.path === path);
      return {
        name: file?.name || path.split('/').pop(),
        path: path,
        type: file?.type || 'unknown',
        contentPreview: fileContents[path] 
          ? fileContents[path].substring(0, 200) + (fileContents[path].length > 200 ? '...' : '') 
          : 'Content not loaded'
      };
    });

    // Save the search result with selected files
    fetch('/api/save-result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        result: searchResults,
        localFiles
      }),
    }).then(response => {
      if (response.ok) {
        // Add to local state
        setSavedSearches((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            query,
            result: {
              ...searchResults,
              localFiles
            },
          },
        ]);
      } else {
        console.error('Failed to save search result');
      }
    }).catch(error => {
      console.error('Error saving search result:', error);
    });
  };

  const renderSearchStage = () => {
    if (!searchStage) return null

    return (
      <Card className="mt-4 border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Search Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div
                className={`h-4 w-4 rounded-full ${searchStage === "spotlight" ? "bg-blue-500 animate-pulse" : (searchStage === "ocr" || searchStage === "rag" || searchStage === "perplexity" || searchStage === "approval" || searchStage === "claude" || searchStage === "gemini" || searchStage === "complete") ? "bg-green-500" : "bg-gray-700"}`}
              ></div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <p className="text-sm">Spotlight Search</p>
                  {searchStage === "spotlight" && <RefreshCw className="h-4 w-4 animate-spin" />}
                </div>
                {searchStage === "spotlight" && <p className="text-xs text-gray-400">Scanning local files...</p>}
              </div>
            </div>

            {enableOCR && (
              <div className="flex items-center space-x-2">
                <div
                  className={`h-4 w-4 rounded-full ${searchStage === "ocr" ? "bg-blue-500 animate-pulse" : (searchStage === "rag" || searchStage === "perplexity" || searchStage === "approval" || searchStage === "claude" || searchStage === "gemini" || searchStage === "complete") ? "bg-green-500" : "bg-gray-700"}`}
                ></div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="text-sm">OCR Processing</p>
                    {searchStage === "ocr" && <RefreshCw className="h-4 w-4 animate-spin" />}
                  </div>
                  {searchStage === "ocr" && (
                    <p className="text-xs text-gray-400">Extracting text from images and scans...</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <div
                className={`h-4 w-4 rounded-full ${searchStage === "rag" ? "bg-blue-500 animate-pulse" : (searchStage === "perplexity" || searchStage === "approval" || searchStage === "claude" || searchStage === "gemini" || searchStage === "complete") ? "bg-green-500" : "bg-gray-700"}`}
              ></div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <p className="text-sm">RAG Processing</p>
                  {searchStage === "rag" && <RefreshCw className="h-4 w-4 animate-spin" />}
                </div>
                {searchStage === "rag" && <p className="text-xs text-gray-400">Analyzing document context...</p>}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div
                className={`h-4 w-4 rounded-full ${searchStage === "perplexity" ? "bg-blue-500 animate-pulse" : (searchStage === "approval" || searchStage === "claude" || searchStage === "gemini" || searchStage === "complete") ? "bg-green-500" : "bg-gray-700"}`}
              ></div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <p className="text-sm">Perplexity Research</p>
                  {searchStage === "perplexity" && <RefreshCw className="h-4 w-4 animate-spin" />}
                </div>
                {searchStage === "perplexity" && <p className="text-xs text-gray-400">Gathering web information...</p>}
              </div>
            </div>

            {requireApproval && (
              <div className="flex items-center space-x-2">
                <div
                  className={`h-4 w-4 rounded-full ${searchStage === "approval" ? "bg-yellow-500 animate-pulse" : (searchStage === "claude" || searchStage === "gemini" || searchStage === "complete") ? "bg-green-500" : "bg-gray-700"}`}
                ></div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="text-sm">User Approval</p>
                    {searchStage === "approval" && <RefreshCw className="h-4 w-4 animate-spin" />}
                  </div>
                  {searchStage === "approval" && (
                    <p className="text-xs text-gray-400">Waiting for approval to continue...</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <div
                className={`h-4 w-4 rounded-full ${searchStage === "claude" || searchStage === "gemini" ? "bg-blue-500 animate-pulse" : searchStage === "complete" ? "bg-green-500" : "bg-gray-700"}`}
              ></div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <p className="text-sm">{selectedModel === "claude" ? "Claude Synthesis" : "Gemini Synthesis"}</p>
                  {(searchStage === "claude" || searchStage === "gemini") && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}
                </div>
                {(searchStage === "claude" || searchStage === "gemini") && (
                  <p className="text-xs text-gray-400">
                    Collating and synthesizing results with{" "}
                    {selectedModel === "claude" ? "Claude 3.7 Sonnet" : "Gemini 1.5 Pro"}...
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderReasoningFlow = () => {
    if (reasoningSteps.length === 0) return null

    return (
      <Card className="mt-4 border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-400" />
            Reasoning Flow
          </CardTitle>
          <CardDescription>Detailed step-by-step reasoning process</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative pl-8 pr-4 py-2">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-700"></div>

            {reasoningSteps.map((step, index) => (
              <div key={step.id} className="mb-4 relative">
                <div className="absolute left-[-12px] top-2 w-3 h-3 rounded-full bg-gray-700 z-10">
                  <div
                    className={`absolute inset-[2px] rounded-full ${step.type === "process" ? "bg-blue-500" : "bg-green-500"}`}
                  ></div>
                </div>

                <Collapsible open={step.expanded} onOpenChange={() => toggleReasoningStep(step.id)}>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 p-2 rounded-md">
                      {step.type === "process" ? (
                        <Cpu className="h-4 w-4 text-blue-400 shrink-0" />
                      ) : (
                        <Layers className="h-4 w-4 text-green-400 shrink-0" />
                      )}
                      <div className="font-medium text-sm flex-1">{step.title}</div>
                      {step.expanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-6 pr-2 py-2 text-sm text-gray-300 whitespace-pre-line">{step.content}</div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Add a component to display raw Perplexity research results
  const renderRawResearchResults = () => {
    // Find the perplexity reasoning step with the web research
    const perplexityStep = reasoningSteps.find(step => 
      step.id === "perplexity-synthesis" || step.id === "perplexity-simulated"
    );
    
    if (!perplexityStep) return null;
    
    return (
      <Card className="mt-4 border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-400" />
            Raw Web Research Results
          </CardTitle>
          <CardDescription>Unprocessed search results from Perplexity</CardDescription>
        </CardHeader>
        <CardContent>
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full mb-2">
                <Eye className="h-4 w-4 mr-2" />
                View Raw Research Data
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="bg-gray-900 p-4 rounded-md border border-gray-800 mt-2">
                <pre className="text-xs overflow-auto whitespace-pre-wrap text-gray-300">{perplexityStep.content}</pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    );
  };

  const renderOCRResults = () => {
    if (ocrResults.length === 0) return null

    return (
      <Card className="mt-4 border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-4 w-4 text-purple-400" />
            OCR Results
          </CardTitle>
          <CardDescription>Text extracted from images and scanned documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ocrResults.map((result) => (
              <div key={result.id} className="p-3 bg-gray-800 rounded-md">
                <div className="font-medium text-sm mb-1">{result.filename}</div>
                <div className="text-sm text-gray-300">{result.content}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderApprovalRequest = () => {
    if (!awaitingApproval) return null

    return (
      <Card className="mt-4 border-gray-800 border-yellow-600">
        <CardHeader className="pb-2 bg-yellow-950/30">
          <CardTitle className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse"></div>
            Approval Required
          </CardTitle>
          <CardDescription>Review search results before final synthesis</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            <p className="text-sm">
              Initial search and research completed. Review the reasoning flow and collected information before
              proceeding with final synthesis using{" "}
              {selectedModel === "claude" ? "Claude 3.7 Sonnet" : "Gemini 1.5 Pro"}.
            </p>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAwaitingApproval(false)
                  setIsSearching(false)
                  setSearchStage(null)
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSearch}>
                <Check className="h-4 w-4 mr-2" />
                Approve & Continue
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderSpotlightResults = () => {
    if (!spotlightFiles.length) return null;

    // Count priority files
    const priorityFiles = spotlightFiles.filter(file => {
      const ext = file.type.toLowerCase();
      return ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.html', '.htm', '.md', '.markdown', '.txt'].includes(ext);
    });

    return (
      <Card className="border-gray-800 mt-4">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Search className="h-4 w-4" />
            Spotlight Search Results
            <Badge className="bg-blue-900/30 text-blue-400 ml-2">
              {spotlightFiles.length} files
            </Badge>
            {priorityFiles.length > 0 && (
              <Badge className="bg-green-900/30 text-green-400">
                {priorityFiles.length} priority docs
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Select files to include in the search context
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {priorityFiles.length > 0 && (
              <div className="pb-2">
                <div className="text-xs font-medium text-green-400 mb-2">RECOMMENDED DOCUMENTS</div>
                {priorityFiles.map((file) => (
                  <FileItem 
                    key={file.path} 
                    file={file} 
                    selected={selectedFiles.includes(file.path)}
                    onToggle={() => toggleFileSelection(file.path)}
                  />
                ))}
              </div>
            )}
            
            <div className="text-xs font-medium text-blue-400 mb-2">ALL FILES</div>
            {spotlightFiles
              .filter(file => !priorityFiles.includes(file))
              .map((file) => (
                <FileItem 
                  key={file.path} 
                  file={file} 
                  selected={selectedFiles.includes(file.path)}
                  onToggle={() => toggleFileSelection(file.path)}
                />
              ))
            }
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => selectAllFiles()}
            >
              Select All
            </Button>
            
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              </p>
              <Button 
                size="sm"
                onClick={() => {
                  if (searchContext?.query) {
                    continueSearch(searchContext.query);
                  }
                }}
              >
                Continue
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const fetchFileContent = async (filePath: string) => {
    try {
      console.log(`Fetching content for file: ${filePath}`);
      
      // Add loading state to show users something is happening
      setFileContents(prev => ({
        ...prev,
        [filePath]: '⌛ Loading content...'
      }));
      
      const response = await fetch(`/api/file-content?path=${encodeURIComponent(filePath)}`);
      const data = await response.json();
      
      if (!response.ok) {
        // Handle error response
        console.error(`Error fetching file content (${response.status}):`, data.error);
        
        // Show error message in the content area
        let errorMessage = 'Failed to load file content';
        
        if (data.error === 'Binary file detected') {
          errorMessage = '📄 This appears to be a binary file and cannot be displayed as text.';
        } else if (data.error === 'File not found') {
          errorMessage = '❌ File not found. It may have been moved or deleted.';
        } else if (data.error === 'Permission denied to read file') {
          errorMessage = '🔒 Permission denied. Please check file access permissions.';
        } else if (data.error) {
          errorMessage = `❌ Error: ${data.error}`;
        }
        
        setFileContents(prev => ({
          ...prev,
          [filePath]: errorMessage
        }));
        
        return;
      }
      
      // Check if we got content
      if (data.content) {
        setFileContents(prev => ({
          ...prev,
          [filePath]: data.content
        }));
        
        // Log a success message
        console.log(`Successfully loaded content for ${filePath} (${data.content.length} chars${data.truncated ? ', truncated' : ''})`);
      } else {
        // Content is missing
        setFileContents(prev => ({
          ...prev,
          [filePath]: '⚠️ File could not be read as text'
        }));
      }
    } catch (error) {
      console.error("Error fetching file content:", error);
      
      // Generic error message
      setFileContents(prev => ({
        ...prev,
        [filePath]: `❌ Error loading file content: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    }
  };

  // Function to render the permissions guide dialog
  const renderPermissionsGuide = () => {
    if (!showPermissionsGuide) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-6 max-w-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Spotlight Permissions Required</h2>
            <Button 
              className="h-8 w-8 rounded-full p-0" 
              onClick={() => setShowPermissionsGuide(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-4 text-gray-300">
            <p>
              MacRAG Search needs permission to access files on your Mac through Spotlight.
              Currently, macOS is blocking this access.
            </p>
            
            <div className="bg-gray-800 p-4 rounded-md">
              <h3 className="text-blue-400 font-medium mb-2">How to enable permissions:</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Open <strong>System Settings</strong> (or System Preferences)</li>
                <li>Go to <strong>Privacy & Security</strong> → <strong>Full Disk Access</strong></li>
                <li>Click the lock icon in the bottom left and enter your password</li>
                <li>Click the <strong>+</strong> button to add an application</li>
                <li>
                  Find and select <strong>Terminal</strong> (or iTerm, or whatever terminal app you're using to run this app)
                </li>
                <li>Make sure the checkbox next to the app is <strong>checked</strong></li>
                <li>Restart your terminal and the application</li>
              </ol>
            </div>
            
            <div className="flex justify-between pt-2">
              <Button 
                variant="outline"
                onClick={() => setShowPermissionsGuide(false)}
              >
                I'll do this later
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  setShowPermissionsGuide(false);
                  // Try to recheck permissions after user action
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
                }}
              >
                I've enabled permissions
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add a button for continuing search after file selection
  const renderContinueButton = () => {
    if (!searchPaused || !searchContext || selectedFiles.length === 0) return null;
    
    return (
      <div className="mt-4">
        <Card className="border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Ready to continue</h3>
              <p className="text-xs text-gray-400">
                {selectedFiles.length} files selected for analysis
              </p>
            </div>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setSearchPaused(false);
                if (searchContext) {
                  continueSearch(searchContext.query);
                }
              }}
            >
              Continue with Analysis
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Update the renderSettingsModal function to save settings on close
  const renderSettingsModal = () => {
    if (!settingsOpen) return null;
    
    return (
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Search Settings</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">API Keys (Optional)</h3>
              <div className="space-y-2">
                <Label htmlFor="perplexityApiKey" className="flex justify-between">
                  <span>Perplexity API Key</span>
                  {apiKeys.perplexity && (
                    <span className="text-xs text-gray-400">
                      Length: {apiKeys.perplexity.length} chars
                    </span>
                  )}
                </Label>
                <Input
                  id="perplexityApiKey"
                  type={showPerplexityKey ? "text" : "password"}
                  placeholder="pplx-..."
                  value={apiKeys.perplexity}
                  onChange={(e) => setApiKeys({...apiKeys, perplexity: e.target.value})}
                  className="font-mono text-xs"
                />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    Perplexity API keys start with "pplx-" and are typically 51 characters long.
                    {apiKeys.perplexity && !apiKeys.perplexity.startsWith('pplx-') && (
                      <span className="text-yellow-500 block mt-1">
                        Warning: API key should start with "pplx-"
                      </span>
                    )}
                    {apiKeys.perplexity && apiKeys.perplexity.length < 40 && (
                      <span className="text-yellow-500 block mt-1">
                        Warning: API key seems too short (expected ~51 chars)
                      </span>
                    )}
                    Get a key at{" "}
                    <a
                      href="https://www.perplexity.ai/key"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      perplexity.ai/key
                    </a>
                  </p>
                  <div className="flex gap-2">
                    {apiKeys.perplexity && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPerplexityKey(!showPerplexityKey)}
                      >
                        {showPerplexityKey ? 'Hide' : 'Show'}
                      </Button>
                    )}
                    {apiKeys.perplexity && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          try {
                            debug('Testing Perplexity API key:', {
                              length: apiKeys.perplexity.length,
                              prefix: apiKeys.perplexity.substring(0, 5) + '...'
                            });
                            
                            // Attempt a simple test call with the "sonar" model (not small-online)
                            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'Authorization': `Bearer ${apiKeys.perplexity}`
                              },
                              body: JSON.stringify({
                                model: 'sonar', // Using a valid model name
                                messages: [
                                  { role: 'user', content: 'Say hello' }
                                ],
                                max_tokens: 10
                              })
                            });
                            
                            if (response.ok) {
                              const data = await response.json();
                              debug('API test succeeded:', data);
                              alert('API key works! Successfully connected to Perplexity.');
                            } else {
                              const error = await response.text();
                              debug('API test failed:', error);
                              alert(`API key test failed: ${response.status} - ${error}`);
                            }
                          } catch (error) {
                            debug('API test error:', error);
                            alert(`Error testing API key: ${error instanceof Error ? error.message : String(error)}`);
                          }
                        }}
                      >
                        Test API Key
                      </Button>
                    )}
                  </div>
                </div>
                {showPerplexityKey && apiKeys.perplexity && (
                  <div className="mt-2 p-2 bg-gray-800 rounded border border-gray-700 overflow-x-auto">
                    <pre className="text-xs font-mono text-gray-200 whitespace-pre-wrap break-all">
                      {apiKeys.perplexity}
                    </pre>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="claudeApiKey">Claude API Key</Label>
                <Input
                  id="claudeApiKey"
                  type="password"
                  placeholder="sk-ant-..."
                  value={apiKeys.anthropic}
                  onChange={(e) => setApiKeys({...apiKeys, anthropic: e.target.value})}
                />
                <p className="text-xs text-gray-500">
                  Used for synthesis with Claude models.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="geminiApiKey">Gemini API Key</Label>
                <Input
                  id="geminiApiKey"
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKeys.gemini}
                  onChange={(e) => setApiKeys({...apiKeys, gemini: e.target.value})}
                />
                <div className="flex justify-between">
                  <p className="text-xs text-gray-500">
                    Used for synthesis with Gemini models.
                  </p>
                  {apiKeys.gemini && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        try {
                          debug('Testing Gemini API key:', {
                            length: apiKeys.gemini.length
                          });
                          
                          // Test the Gemini API key
                          const response = await fetch('/api/gemini-check', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              apiKey: apiKeys.gemini
                            })
                          });
                          
                          const data = await response.json();
                          
                          if (response.ok && data.success) {
                            debug('Gemini API test succeeded:', data);
                            alert('Gemini API key works! Successfully connected to Gemini.');
                          } else {
                            debug('Gemini API test failed:', data);
                            alert(`Gemini API key test failed: ${data.error || 'Unknown error'}`);
                          }
                        } catch (error) {
                          debug('Gemini API test error:', error);
                          alert(`Error testing Gemini API key: ${error instanceof Error ? error.message : String(error)}`);
                        }
                      }}
                    >
                      Test API Key
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Spotlight Settings</h3>
              <div className="space-y-2">
                <Label htmlFor="spotlightDir">Local Files Directory</Label>
                <Input
                  id="spotlightDir"
                  placeholder="/path/to/files"
                  value={spotlightDir}
                  onChange={(e) => setSpotlightDir(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Path to directory with local files for search context
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => {
              // Store settings in localStorage
              try {
                debug('Saving API keys to localStorage:', {
                  perplexityLength: apiKeys.perplexity?.length,
                  perplexityPrefix: apiKeys.perplexity?.substring(0, 5) + '...',
                });
                localStorage.setItem('argus-api-keys', JSON.stringify(apiKeys));
                localStorage.setItem('perplexityModel', perplexityModel);
                localStorage.setItem('spotlightDir', spotlightDir);
                localStorage.setItem('forceRealApi', forceRealApi.toString());
                setSettingsOpen(false);
              } catch (e) {
                console.error('Error saving settings:', e);
                debug('Error saving settings:', e);
              }
            }}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Toggle file selection
  const toggleFileSelection = (filePath: string) => {
    if (selectedFiles.includes(filePath)) {
      setSelectedFiles(selectedFiles.filter(path => path !== filePath));
    } else {
      setSelectedFiles([...selectedFiles, filePath]);
      
      // Fetch content for text files automatically when selected
      if (!fileContents[filePath]) {
        fetchFileContent(filePath);
      }
    }
  };
  
  // Select all files
  const selectAllFiles = () => {
    setSelectedFiles(spotlightFiles.map(file => file.path));
    
    // Fetch content for all text files
    spotlightFiles.forEach(file => {
      if (!fileContents[file.path] && !file.type.includes('image')) {
        fetchFileContent(file.path);
      }
    });
  };
  
  // FileItem component
  const FileItem = ({ 
    file, 
    selected, 
    onToggle 
  }: { 
    file: { path: string; name: string; type: string }; 
    selected: boolean; 
    onToggle: () => void 
  }) => {
    // Determine file icon based on type
    let FileIcon = FileText;
    if (file.type.includes('image')) FileIcon = FileImage;
    else if (file.type === '.pdf') FileIcon = FileText;
    else if (file.type === '.ppt' || file.type === '.pptx') FileIcon = Layers;
    else if (file.type === '.doc' || file.type === '.docx') FileIcon = FileText;
    
    // Check if this is a priority file type
    const isPriority = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.html', '.htm', '.md', '.markdown', '.txt'].includes(file.type);
    
    // Determine if content is loaded
    const hasContent = fileContents[file.path] !== undefined;
    const isLoading = fileContents[file.path] === '⌛ Loading content...';
    const hasError = fileContents[file.path]?.startsWith('❌') || 
                     fileContents[file.path]?.startsWith('🔒') ||
                     fileContents[file.path]?.startsWith('⚠️');
    
    return (
      <div 
        className={`flex items-start py-2 px-1 hover:bg-gray-900 rounded ${isPriority ? 'border-l-2 border-green-500 pl-2' : ''}`}
      >
        <div className="flex items-center mr-2">
          <input
            type="checkbox"
            id={`file-${file.path}`}
            checked={selected}
            onChange={onToggle}
            className="h-4 w-4 rounded border-gray-500"
          />
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex justify-between">
            <div className="flex items-center gap-1">
              <FileIcon className={`h-4 w-4 ${isPriority ? 'text-green-400' : 'text-gray-400'} mr-1`} />
              <label 
                htmlFor={`file-${file.path}`}
                className={`text-sm font-medium cursor-pointer truncate max-w-[220px] ${isPriority ? 'text-green-300' : ''}`}
              >
                {file.name}
              </label>
            </div>
            <div className="flex items-center">
              {hasContent && !isLoading && !hasError && (
                <Badge className="bg-green-900/30 text-green-400 mr-1">Loaded</Badge>
              )}
              {isLoading && (
                <Badge className="bg-yellow-900/30 text-yellow-400 mr-1">Loading</Badge>
              )}
              {hasError && (
                <Badge className="bg-red-900/30 text-red-400 mr-1">Error</Badge>
              )}
              <Badge className={`text-xs ${isPriority ? 'bg-green-900/30 text-green-400' : ''}`}>
                {file.type.split('.').pop() || file.path.split('.').pop() || 'file'}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-gray-400 truncate">{file.path}</p>
        </div>
      </div>
    );
  };

  // Add a skip button component for the Perplexity search
  const renderPerplexityStatus = () => {
    if (perplexityStatus.status === 'idle') return null;
    
    return (
      <div className="mt-4">
        <Card className="border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              {perplexityStatus.status === 'connecting' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <div className="text-sm">
                    <span className="font-medium">{perplexityStatus.message}</span>
                    <p className="text-gray-400 text-xs mt-1">
                      Gathering information from the web. This might take several minutes for complex queries.
                      {searchPaused && " Paused - click Continue to resume."}
                    </p>
                  </div>
                </>
              ) : perplexityStatus.status === 'error' ? (
                <>
                  <X className="h-4 w-4 text-red-500" />
                  <div className="text-sm">
                    <span className="font-medium">{perplexityStatus.message}</span>
                    <p className="text-gray-400 text-xs mt-1">
                      There may be connectivity issues with the Perplexity API. Using available information to continue.
                      You might want to try your search again later.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <div className="text-sm">
                    <span className="font-medium">{perplexityStatus.message}</span>
                    <p className="text-gray-400 text-xs mt-1">Information gathered successfully.</p>
                  </div>
                </>
              )}
            </div>
            
            {perplexityStatus.status === 'connecting' && searchStage === 'perplexity' && searchPaused && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={skipPerplexityResearch}
                >
                  <FastForward className="h-4 w-4 mr-2" />
                  Skip Web Research
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Add before the return statement, after all other render functions are defined
  const renderDebugPanel = () => {
    if (!showDebugPanel) return null;
    
    return (
      <Card className="mt-4 border-red-800 bg-gray-900">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-red-400">
            <Cpu className="h-4 w-4" />
            Perplexity API Debug Panel
          </CardTitle>
          <CardDescription>
            Detailed information about Perplexity API requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-800 p-2 rounded">
                <span className="text-gray-400">API Key Status:</span>{" "}
                {apiKeys.perplexity ? (
                  <Badge className="bg-green-900/30 text-green-400">
                    Present ({apiKeys.perplexity.length} chars)
                  </Badge>
                ) : (
                  <Badge className="bg-red-900/30 text-red-400">Missing</Badge>
                )}
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <span className="text-gray-400">API Key Format:</span>{" "}
                {apiKeys.perplexity && apiKeys.perplexity.startsWith("pplx-") ? (
                  <Badge className="bg-green-900/30 text-green-400">Valid prefix</Badge>
                ) : (
                  <Badge className="bg-red-900/30 text-red-400">
                    Invalid prefix
                  </Badge>
                )}
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <span className="text-gray-400">Selected Model:</span>{" "}
                <Badge className="bg-blue-900/30 text-blue-400">{perplexityModel}</Badge>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <span className="text-gray-400">Force Real API:</span>{" "}
                <Badge
                  className={
                    forceRealApi
                      ? "bg-green-900/30 text-green-400"
                      : "bg-gray-900/30 text-gray-400"
                  }
                >
                  {forceRealApi ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>

            <div className="bg-gray-800 p-3 rounded">
              <h3 className="font-medium mb-2 text-sm">Last Request Status:</h3>
              <div className="flex items-center gap-2">
                {perplexityStatus.status === "idle" ? (
                  <Badge className="bg-gray-900/30 text-gray-400">No requests made</Badge>
                ) : perplexityStatus.status === "connecting" ? (
                  <Badge className="bg-yellow-900/30 text-yellow-400">
                    <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                    Connecting...
                  </Badge>
                ) : perplexityStatus.status === "success" ? (
                  <Badge className="bg-green-900/30 text-green-400">
                    <Check className="h-3 w-3 mr-1" />
                    Success
                  </Badge>
                ) : (
                  <Badge className="bg-red-900/30 text-red-400">
                    <X className="h-3 w-3 mr-1" />
                    Error
                  </Badge>
                )}
                <span className="text-sm">{perplexityStatus.message}</span>
              </div>
            </div>

            {perplexityApiError && (
              <div className="bg-red-900/20 border border-red-800 p-3 rounded">
                <h3 className="font-medium mb-2 text-sm text-red-400">API Error:</h3>
                <pre className="text-xs overflow-auto whitespace-pre-wrap text-red-300">
                  {perplexityApiError}
                </pre>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const result = await fetch('/api/perplexity-check', {
                      method: 'GET',
                      cache: 'no-store'
                    });
                    
                    const data = await result.json();
                    
                    if (result.ok && data.status === 'ok') {
                      setPerplexityApiError(null);
                      setPerplexityStatus({
                        status: 'success',
                        message: `Connectivity test passed: ${data.perplexityStatus}`
                      });
                    } else {
                      setPerplexityApiError(`Connectivity test failed: ${data.message || data.error || 'Unknown error'}`);
                      setPerplexityStatus({
                        status: 'error',
                        message: 'Cannot reach Perplexity API'
                      });
                    }
                  } catch (err) {
                    setPerplexityApiError(`Connectivity test failed: ${err instanceof Error ? err.message : String(err)}`);
                    setPerplexityStatus({
                      status: 'error',
                      message: 'Cannot reach Perplexity API'
                    });
                  }
                }}
                className="bg-gray-800 hover:bg-gray-700"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Test API Connectivity
              </Button>
              
              <Button
                size="sm"
                onClick={async () => {
                  if (!apiKeys.perplexity) {
                    alert("Please enter a Perplexity API key in settings first");
                    return;
                  }
                  
                  // Test with a simple query
                  const result = await tryDirectPerplexityApi(
                    "Tell me a short joke about programming",
                    apiKeys.perplexity,
                    perplexityModel
                  );
                  
                  if (result) {
                    alert("API Test Success! Response: " + result.substring(0, 100) + "...");
                  }
                }}
                className="bg-gray-800 hover:bg-gray-700"
              >
                Test API Request
              </Button>
            </div>

            <div className="flex gap-2 justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open('/debug/perplexity-test', '_blank');
                }}
                className="bg-gray-800 hover:bg-gray-700"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open API Test Page
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDebugPanel(false);
                }}
                className="bg-gray-800 hover:bg-gray-700"
              >
                Close Debug Panel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-100">
      {/* Add settings modal */}
      {renderSettingsModal()}
      
      {/* Permission guide dialog */}
      {renderPermissionsGuide()}
      
      <div className="flex flex-col w-64 border-r border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-8">
          <Brain className="h-6 w-6 text-blue-400" />
          <h1 className="text-xl font-bold">MacRAG Search</h1>
        </div>

        <nav className="space-y-1">
          <Button className="w-full justify-start" disabled>
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
          <Button className="w-full justify-start" disabled>
            <Database className="mr-2 h-4 w-4" />
            History
          </Button>
          <Button className="w-full justify-start" disabled>
            <FileText className="mr-2 h-4 w-4" />
            Saved Results
          </Button>
          <Button variant="ghost" className="justify-start pl-2 w-full" asChild>
            <a href="/debug/perplexity-test">
              <span className="flex items-center">
                <Cpu className="mr-2 h-4 w-4" />
                Perplexity Tester
              </span>
            </a>
          </Button>
          
          <Button variant="ghost" className="justify-start pl-2 w-full" asChild>
            <a href="/debug/gemini-test">
              <span className="flex items-center">
                <Brain className="mr-2 h-4 w-4" />
                Gemini Tester
              </span>
            </a>
          </Button>
        </nav>

        <div className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model-select" className="text-xs text-gray-400">
              Synthesis Model
            </Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger id="model-select" className="bg-gray-900 border-gray-700">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {SYNTHESIS_MODELS && SYNTHESIS_MODELS.map(model => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="perplexity-model-select" className="text-xs text-gray-400">
              Perplexity Research Model
            </Label>
            <Select value={perplexityModel} onValueChange={setPerplexityModel}>
              <SelectTrigger id="perplexity-model-select" className="bg-gray-900 border-gray-700">
                <SelectValue placeholder="Select research model" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {PERPLEXITY_MODELS && PERPLEXITY_MODELS.map(model => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="approval-toggle" className="text-xs text-gray-400">
              Require Approval
            </Label>
            <Switch id="approval-toggle" checked={requireApproval} onCheckedChange={setRequireApproval} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="ocr-toggle" className="text-xs text-gray-400">
              Enable OCR
            </Label>
            <Switch id="ocr-toggle" checked={enableOCR} onCheckedChange={setEnableOCR} />
          </div>
          
          {/* Add a settings button */}
          <Button 
            variant="outline" 
            className="w-full mt-4" 
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            API Settings
          </Button>
        </div>

        <div className="mt-auto">
          <div className="text-xs text-gray-400 mb-2">Connected Services:</div>
          <div className="flex flex-wrap gap-2">
            {spotlightStatus === 'checking' && (
              <Badge className="bg-gray-900/30 text-gray-400 hover:bg-gray-900/50 border-gray-800 text-xs">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Spotlight
              </Badge>
            )}
            {spotlightStatus === 'available' && (
              <Badge className="bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 border-blue-800 text-xs">
                <Check className="h-3 w-3 mr-1" />
                Spotlight
              </Badge>
            )}
            {spotlightStatus === 'unavailable' && (
              <Badge 
                className="bg-red-900/30 text-red-400 hover:bg-red-900/50 border-red-800 text-xs group relative cursor-pointer"
                onClick={() => setShowPermissionsGuide(true)}
              >
                <X className="h-3 w-3 mr-1" />
                Spotlight
                
                {/* Tooltip for error info */}
                <span className="hidden group-hover:block absolute bottom-full left-0 mb-2 p-2 bg-red-900/80 text-white text-xs rounded whitespace-nowrap">
                  {spotlightError || 'Spotlight is not available. Click to fix.'}
                </span>
              </Badge>
            )}
            {spotlightStatus === 'error' && (
              <Badge className="bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50 border-yellow-800 text-xs group relative">
                <X className="h-3 w-3 mr-1" />
                Spotlight
                
                {/* Tooltip for error info */}
                <span className="hidden group-hover:block absolute bottom-full left-0 mb-2 p-2 bg-yellow-900/80 text-white text-xs rounded whitespace-nowrap">
                  {spotlightError || 'Error checking Spotlight status'}
                </span>
              </Badge>
            )}
            
            <Badge variant="outline" className="text-xs">
              Perplexity
            </Badge>
            <Badge variant="outline" className="text-xs">
              Claude 3.7
            </Badge>
            <Badge variant="outline" className="text-xs">
              Gemini 1.5
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Intelligent Search</h2>

          <div className="flex space-x-2 mb-6">
            <div className="relative flex-1">
              <Input
                placeholder="Ask any question..."
                className="pr-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <Button 
                className="absolute right-2 top-2 h-6 w-6 p-0"
                size="sm"
                variant="ghost"
                onClick={handleSearch}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            <Button onClick={handleSearch} disabled={isSearching && !awaitingApproval}>
              {isSearching && !awaitingApproval ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>

          <div className="mb-4">
            <Select value={perplexityModel} onValueChange={setPerplexityModel}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {PERPLEXITY_MODELS && PERPLEXITY_MODELS.map(model => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Show Spotlight results when available */}
          {spotlightFiles.length > 0 && renderSpotlightResults()}
          
          {/* Show continue button when paused */}
          {renderContinueButton()}

          {renderSearchStage()}
          {renderRawResearchResults()}
          {renderOCRResults()}
          {renderApprovalRequest()}

          {renderPerplexityStatus()}

          {searchResults && (
            <div className="mt-4 space-y-4">
              <Card className="border-gray-800">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-bold">Search Results</CardTitle>
                    <Button variant="ghost" size="sm" onClick={saveSearch}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="prose dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: searchResults.content }} />
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-800">
                    <h3 className="text-sm font-medium mb-2">Sources:</h3>
                    <div className="space-y-2">
                      {searchResults.sources.map((source: any, index: number) => (
                        <div key={index} className="flex items-start space-x-2 text-sm">
                          <div className="h-5 w-5 flex items-center justify-center rounded-full bg-gray-800 text-xs flex-shrink-0">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{source.title}</div>
                            <div className="text-gray-400 text-xs">{source.url || source.path}</div>
                          </div>
                        </div>
                      ))}

                      {selectedFiles.length > 0 && (
                        <div className="pt-2 mt-2 border-t border-gray-800">
                          <div className="font-medium text-sm mb-1">Local Files:</div>
                          {selectedFiles.map((path, index) => {
                            const file = spotlightFiles.find(f => f.path === path);
                            return file ? (
                              <div key={`local-${index}`} className="flex items-start space-x-2 text-sm">
                                <div className="h-5 w-5 flex items-center justify-center rounded-full bg-gray-800 text-xs flex-shrink-0">
                                  L{index + 1}
                                </div>
                                <div>
                                  <div className="font-medium">{file.name}</div>
                                  <div className="text-gray-400 text-xs">{file.path}</div>
                                </div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Tabs defaultValue="history" className="mt-8">
            <TabsList className="bg-gray-900 border-gray-800">
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="saved">Saved Searches</TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="mt-4">
              <Card className="border-gray-800">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Recent Searches</CardTitle>
                </CardHeader>
                <CardContent>
                  {savedSearches.length === 0 ? (
                    <p className="text-gray-400 text-sm">No recent searches</p>
                  ) : (
                    <div className="space-y-2">
                      {savedSearches.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-lg bg-gray-900 hover:bg-gray-800 cursor-pointer"
                          onClick={() => {
                            setQuery(item.query)
                            setSearchResults(item.result)
                          }}
                        >
                          <p className="font-medium">{item.query}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(parseInt(item.id)).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="saved" className="mt-4">
              <Card className="border-gray-800">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Saved Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm">No saved results</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}


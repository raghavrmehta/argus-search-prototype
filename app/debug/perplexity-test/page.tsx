"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Check, X, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// List of valid Perplexity models
const VALID_MODELS = [
  { value: "sonar-deep-research", label: "Sonar Deep Research (128k)" },
  { value: "sonar-reasoning-pro", label: "Sonar Reasoning Pro (128k)" },
  { value: "sonar-reasoning", label: "Sonar Reasoning (128k)" },
  { value: "sonar-pro", label: "Sonar Pro (200k)" },
  { value: "sonar", label: "Sonar (128k)" },
  { value: "r1-1776", label: "r1-1776 (128k)" }
];

export default function PerplexityTestPage() {
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState("sonar")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [networkStatus, setNetworkStatus] = useState<{
    online: boolean;
    lastChecked: string;
  }>({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastChecked: new Date().toISOString()
  })

  // Check network status
  const checkNetworkStatus = () => {
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setNetworkStatus({
      online,
      lastChecked: new Date().toISOString()
    });
    return online;
  }

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus({
        online: true,
        lastChecked: new Date().toISOString()
      });
    };

    const handleOffline = () => {
      setNetworkStatus({
        online: false,
        lastChecked: new Date().toISOString()
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      console.log(`Testing Perplexity API with model: ${model} and query: ${query}`)
      
      // Use our internal API route to avoid CORS issues
      const result = await fetch('/api/perplexity-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey,
          model,
          query
        })
      });

      // Parse the response
      if (result.ok) {
        const data = await result.json();
        setResponse(data);
        console.log('API response:', data);
      } else {
        const errorText = await result.text();
        try {
          // Try to parse error as JSON
          const errorJson = JSON.parse(errorText);
          setError(`API Error (${result.status}): ${errorJson.error || errorText}`);
        } catch (e) {
          // If not JSON, use text
          setError(`API Error (${result.status}): ${errorText}`);
        }
        console.error('API error:', result.status, errorText);
      }
    } catch (err) {
      setError(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Request error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add a function to test server connectivity
  const testServerConnectivity = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check network first
      if (!checkNetworkStatus()) {
        setError("Your device appears to be offline. Please check your internet connection.");
        setLoading(false);
        return;
      }
      
      // Try to reach our API endpoint with a simple request
      const result = await fetch('/api/health-check', {
        method: 'GET',
        cache: 'no-store'
      });
      
      if (result.ok) {
        setError(null);
        alert("Server connectivity test successful! Your app can reach the server.");
      } else {
        setError(`Server connectivity test failed with status: ${result.status}`);
      }
    } catch (err) {
      setError(`Server connectivity test failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Add a test function for Perplexity API connectivity
  const testPerplexityApiConnectivity = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check network first
      if (!checkNetworkStatus()) {
        setError("Your device appears to be offline. Please check your internet connection.");
        setLoading(false);
        return;
      }
      
      // Use our server endpoint to check Perplexity API connectivity
      const result = await fetch('/api/perplexity-check', {
        method: 'GET',
        cache: 'no-store'
      });
      
      const data = await result.json();
      
      if (result.ok && data.status === 'ok') {
        setError(null);
        alert(`Perplexity API connectivity test successful! Server can reach the Perplexity API endpoint.\n\nStatus: ${data.perplexityStatus}`);
      } else {
        setError(`Perplexity API connectivity test failed: ${data.message || data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`Perplexity API connectivity test failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const formatJson = (json: any) => {
    try {
      return JSON.stringify(json, null, 2);
    } catch (e) {
      return String(json);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Perplexity API Test Tool</h1>
      
      {/* Network status indicator */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <h2 className="text-lg font-semibold">Network Diagnostics</h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkNetworkStatus}
          >
            Refresh Status
          </Button>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`h-3 w-3 rounded-full ${networkStatus.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>Network Status: {networkStatus.online ? 'Online' : 'Offline'}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testServerConnectivity} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Server Connectivity'
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testPerplexityApiConnectivity} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Perplexity API Connectivity'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>Enter your API key and query to test</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">
                API Key <span className="text-xs text-gray-500">(should start with "pplx-")</span>
              </label>
              <Input 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)} 
                placeholder="pplx-..." 
                className="font-mono"
                required
              />
              {apiKey && !apiKey.startsWith('pplx-') && (
                <p className="text-yellow-500 text-sm mt-1">
                  Warning: API key should start with "pplx-"
                </p>
              )}
            </div>

            <div>
              <label className="block mb-1 font-medium">Model</label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {VALID_MODELS.map((modelOption) => (
                    <SelectItem key={modelOption.value} value={modelOption.value}>
                      {modelOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block mb-1 font-medium">Query</label>
              <Textarea 
                value={query} 
                onChange={(e) => setQuery(e.target.value)} 
                placeholder="Enter your test query here..." 
                rows={3}
                required
              />
            </div>

            <Button type="submit" disabled={loading || !apiKey || !query}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test API"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-8 border-red-800">
          <CardHeader className="text-red-500">
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-900 p-4 rounded-md overflow-auto text-red-400 text-sm">{error}</pre>
          </CardContent>
        </Card>
      )}

      {response && (
        <Card>
          <CardHeader>
            <CardTitle>API Response</CardTitle>
            <CardDescription>
              Response from Perplexity API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">Full Response</h3>
              <pre className="bg-gray-900 p-4 rounded-md overflow-auto text-sm">{formatJson(response)}</pre>
            </div>

            {response.choices && response.choices[0] && (
              <div>
                <h3 className="font-medium mb-2">Generated Text</h3>
                <div className="bg-gray-900 p-4 rounded-md">
                  <div className="prose dark:prose-invert max-w-none">
                    {response.choices[0].message?.content || "No content returned"}
                  </div>
                </div>
              </div>
            )}

            {response.usage && (
              <div>
                <h3 className="font-medium mb-2">Token Usage</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-900 p-4 rounded-md">
                    <div className="text-xs text-gray-400">Prompt Tokens</div>
                    <div className="text-xl">{response.usage.prompt_tokens}</div>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-md">
                    <div className="text-xs text-gray-400">Completion Tokens</div>
                    <div className="text-xl">{response.usage.completion_tokens}</div>
                  </div>
                  <div className="bg-gray-900 p-4 rounded-md">
                    <div className="text-xs text-gray-400">Total Tokens</div>
                    <div className="text-xl">{response.usage.total_tokens}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
} 
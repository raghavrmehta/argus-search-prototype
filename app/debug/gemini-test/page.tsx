"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Check, X, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"

export default function GeminiTestPage() {
  const [apiKey, setApiKey] = useState("")
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
      console.log(`Testing Gemini API with query: ${query}`)
      
      // Use our internal API route to avoid CORS issues
      const result = await fetch('/api/gemini-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey,
          query
        })
      });

      // Parse the response
      if (result.ok) {
        const data = await result.json();
        if (data.success) {
          setResponse(data.data);
          console.log('API response:', data);
        } else {
          setError(`API Error: ${data.error || 'Unknown error'}`);
          console.error('API error:', data.error);
        }
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

  const formatJson = (json: any) => {
    try {
      return JSON.stringify(json, null, 2);
    } catch (e) {
      return String(json);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Gemini API Test Tool</h1>
      
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
              
              <div className="grid grid-cols-1 gap-2">
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
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Test Gemini API</CardTitle>
          <CardDescription>
            Enter your Gemini API key and a query to test the API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">Gemini API Key</Label>
              <Input
                id="apiKey"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">Gemini API keys typically start with "AIzaSy"</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="query">Test Query</Label>
              <Textarea
                id="query"
                placeholder="Write a short poem about artificial intelligence."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-[100px]"
                required
              />
            </div>
            
            <Button type="submit" disabled={loading || !apiKey || !query}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing API...
                </>
              ) : (
                'Test Gemini API'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {error && (
        <Card className="mb-8 border-red-500">
          <CardHeader className="bg-red-500/10">
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <pre className="bg-gray-900 p-4 rounded-md overflow-auto whitespace-pre-wrap text-sm">
              {error}
            </pre>
          </CardContent>
        </Card>
      )}
      
      {response && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>API Response</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {response.candidates && response.candidates[0] && (
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Generated Content</h3>
                  <div className="bg-gray-900 p-4 rounded-md">
                    <pre className="whitespace-pre-wrap text-sm">
                      {response.candidates[0].content.parts[0].text}
                    </pre>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Raw Response</h3>
                <div className="bg-gray-900 p-4 rounded-md overflow-auto">
                  <pre className="text-xs">{formatJson(response)}</pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="text-center mt-8">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
        >
          Back to Main App
        </Button>
      </div>
    </div>
  );
} 
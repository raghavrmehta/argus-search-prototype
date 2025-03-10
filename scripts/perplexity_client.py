#!/usr/bin/env python3
import os
import sys
import json
import traceback
from typing import Dict, List, Optional, Union, Generator

# Immediately check if we can import requests, if not provide clear error
try:
    import requests
except ImportError:
    print(json.dumps({
        "error": "Python requests module not installed. Please install with: python3 -m pip install requests",
        "answer": "Error: Python requests library not available",
        "references": [],
        "simulated": True
    }))
    sys.exit(1)

# Print debug message at the start for logging
print("Python Perplexity client starting...", file=sys.stderr)

class PerplexityAPI:
    """A client for the Perplexity API."""
    
    BASE_URL = "https://api.perplexity.ai"
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Perplexity API client.
        
        Args:
            api_key: Your Perplexity API key. If not provided, will look for 
                    PERPLEXITY_API_KEY environment variable.
        """
        self.api_key = api_key or os.environ.get("PERPLEXITY_API_KEY")
        if not self.api_key:
            raise ValueError(
                "API key must be provided either as an argument or as the "
                "PERPLEXITY_API_KEY environment variable."
            )
        
        self.headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
    
    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "sonar-pro",
        stream: bool = False,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
    ) -> Union[Dict, Generator]:
        """
        Create a chat completion with the Perplexity API.
        
        Args:
            messages: A list of message dictionaries with 'role' and 'content' keys
            model: The model to use (default: "sonar-pro")
            stream: Whether to stream the response (default: False)
            temperature: Controls randomness (0-1, lower is more deterministic)
            max_tokens: Maximum number of tokens to generate
            top_p: Controls diversity via nucleus sampling
            
        Returns:
            If stream=False, returns the complete response as a dictionary.
            If stream=True, returns a generator that yields response chunks.
        """
        url = f"{self.BASE_URL}/chat/completions"
        
        payload = {
            "model": model,
            "messages": messages,
            "stream": stream,
        }
        
        if temperature is not None:
            payload["temperature"] = temperature
            
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
            
        if top_p is not None:
            payload["top_p"] = top_p
        
        if stream:
            return self._stream_response(url, payload)
        else:
            try:
                print(f"Making request to {url} with model {model}", file=sys.stderr)
                response = requests.post(url, headers=self.headers, json=payload, timeout=30)
                print(f"Got response with status: {response.status_code}", file=sys.stderr)
                
                if response.status_code != 200:
                    print(f"Error response: {response.text}", file=sys.stderr)
                    
                response.raise_for_status()
                return response.json()
            except requests.exceptions.RequestException as e:
                print(f"Error making request to Perplexity API: {str(e)}", file=sys.stderr)
                raise
    
    def _stream_response(self, url: str, payload: Dict) -> Generator:
        """
        Stream the response from the Perplexity API.
        
        Args:
            url: The API endpoint URL
            payload: The request payload
            
        Yields:
            Response chunks as they are received
        """
        with requests.post(url, headers=self.headers, json=payload, stream=True, timeout=30) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if line:
                    if line.startswith(b"data: "):
                        chunk = line[6:]  # Remove "data: " prefix
                        if chunk.strip() != b"[DONE]":
                            yield chunk.decode("utf-8")

def extract_references(content):
    """Extract references from content"""
    references = []
    
    # Check if there's a "References" section
    import re
    references_match = re.search(r'references:?(?:\s*\n)+([\s\S]+)', content, re.IGNORECASE)
    
    if references_match and references_match.group(1):
        references_text = references_match.group(1).strip()
        reference_lines = references_text.split('\n')
        
        for line in reference_lines:
            if not line.strip():
                continue
                
            # Match numbered references like "1. Title - snippet - url"
            match = re.match(r'^\d+\.\s+(.+?)(?:\s+-\s+|\s*\n\s*)(.+?)(?:\s+-\s+|\s*\n\s*)(https?:\/\/\S+)\b', line, re.IGNORECASE)
            
            if match:
                references.append({
                    "title": match.group(1).strip(),
                    "snippet": match.group(2).strip(),
                    "url": match.group(3).strip()
                })
                continue
            
            # If not matched, try to extract just the URL and use the text before it as title/snippet
            url_match = re.match(r'^(.*?)(https?:\/\/\S+)\b', line, re.IGNORECASE)
            
            if url_match and url_match.group(2):
                remaining_text = url_match.group(1).strip()
                split_index = len(remaining_text) // 2
                
                references.append({
                    "title": remaining_text[:split_index].strip() or "Reference",
                    "snippet": remaining_text[split_index:].strip() or "No snippet available",
                    "url": url_match.group(2)
                })
    
    # If no references were found using the structured approach, try a fallback regex pattern
    if not references:
        # Look for URLs in the content
        url_regex = r'\bhttps?:\/\/\S+\b'
        urls = re.findall(url_regex, content, re.IGNORECASE)
        
        # For each URL, extract surrounding text as title and snippet
        for url in urls:
            # Find where the URL occurs in the content
            url_index = content.find(url)
            surrounding_text = content[max(0, url_index - 150):url_index].strip()
            
            # Use the last sentence fragment before the URL as the title
            sentence_parts = re.split(r'[.!?]\s+', surrounding_text)
            title = sentence_parts[-1] if sentence_parts else "Reference"
            
            references.append({
                "title": title or "Reference",
                "snippet": surrounding_text or "No snippet available",
                "url": url
            })
    
    return references

def perform_research(query, api_key, model="sonar-deep-research"):
    """Perform research using Perplexity API and return formatted results"""
    try:
        print(f"Performing research for query: {query} with model: {model}", file=sys.stderr)
        
        # Initialize the API client
        perplexity = PerplexityAPI(api_key)
        
        # Create messages for the research query
        messages = [
            {
                "role": "system",
                "content": "You are a research assistant that provides comprehensive, factual, and up-to-date information. Format citations at the end as a numbered list with titles, snippets, and URLs."
            },
            {
                "role": "user",
                "content": f"Research this topic thoroughly with citations: {query}"
            }
        ]
        
        # Make the API request
        print("Sending request to Perplexity API...", file=sys.stderr)
        response = perplexity.chat_completion(messages=messages, model=model)
        print("Received response from Perplexity API", file=sys.stderr)
        
        # Extract content from response
        content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
        print(f"Extracted content length: {len(content)}", file=sys.stderr)
        
        # Parse the content to extract references
        references = extract_references(content)
        print(f"Extracted {len(references)} references", file=sys.stderr)
        
        # Remove the references section from the answer
        answer = content
        references_index = content.lower().find("references")
        if references_index != -1:
            answer = content[:references_index].strip()
        
        result = {
            "answer": answer,
            "references": references,
            "simulated": False
        }
        
        print("Research completed successfully", file=sys.stderr)
        return result
    except Exception as e:
        print(f"Error in perform_research: {str(e)}", file=sys.stderr)
        print(f"Traceback: {traceback.format_exc()}", file=sys.stderr)
        # Return error information
        return {
            "error": str(e),
            "answer": f"Error performing research: {str(e)}",
            "references": [],
            "simulated": True
        }

# Main handler for when script is called directly
if __name__ == "__main__":
    # Check if input is provided
    print(f"Python script started with {len(sys.argv)} arguments", file=sys.stderr)
    
    if len(sys.argv) < 2:
        print("Error: No input provided", file=sys.stderr)
        print(json.dumps({
            "error": "No input provided to Python script",
            "answer": "Error: No input provided to Python script",
            "references": [],
            "simulated": True
        }))
        sys.exit(1)
    
    try:
        # Parse input from command line argument
        print(f"Parsing input: {sys.argv[1][:100]}...", file=sys.stderr)
        input_data = json.loads(sys.argv[1])
        query = input_data.get("query")
        api_key = input_data.get("apiKey")
        model = input_data.get("model", "sonar-deep-research")
        
        print(f"Parsed input - Query: {query}, API Key provided: {bool(api_key)}, Model: {model}", file=sys.stderr)
        
        if not query:
            print("Error: No query provided", file=sys.stderr)
            print(json.dumps({
                "error": "No query provided",
                "answer": "Error: No query provided to Python script",
                "references": [],
                "simulated": True
            }))
            sys.exit(1)
        
        if not api_key:
            print("Error: No API key provided", file=sys.stderr)
            # Return simulated response
            result = {
                "answer": f"Simulated response for: {query}",
                "references": [
                    {
                        "title": "Simulated Reference",
                        "snippet": "This is a simulated reference snippet.",
                        "url": "https://example.com/simulated"
                    }
                ],
                "error": "No API key provided",
                "simulated": True
            }
        else:
            # Perform the actual research
            result = perform_research(query, api_key, model)
        
        # Output result as JSON
        output = json.dumps(result)
        print(output)
        
    except Exception as e:
        print(f"Unexpected error in Python script: {str(e)}", file=sys.stderr)
        print(f"Traceback: {traceback.format_exc()}", file=sys.stderr)
        print(json.dumps({
            "error": f"Unexpected error in Python script: {str(e)}",
            "answer": f"Error in Python script: {str(e)}",
            "references": [],
            "simulated": True
        }))
        sys.exit(1) 
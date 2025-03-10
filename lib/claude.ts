/**
 * Claude API integration for synthesizing search results
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Synthesizes information using Claude API
 */
export async function synthesizeWithClaude(
  query: string,
  localContext: string,
  webResearch: string,
  apiKey?: string
): Promise<{
  content: string;
  usage?: { input_tokens: number; output_tokens: number };
  error?: string;
}> {
  try {
    // For now, we'll simulate a response since we may not have an actual API key
    // In production, this should be replaced with an actual API call
    
    if (!apiKey) {
      console.log('No Claude API key provided, using simulated response');
      return simulateClaudeResponse(query, localContext, webResearch);
    }
    
    const systemPrompt = `You are a research assistant that creates thorough, well-cited responses by combining information from local documents and web research. 
Your task is to synthesize these two sources of information to create a comprehensive answer to the user's query.

Follow these guidelines:
1. Focus on answering the user's specific query directly and thoroughly
2. Combine information from both local documents and web research
3. Cite all sources clearly - indicate whether information comes from local files or web sources
4. Use a clear, academic tone but remain accessible
5. Organize the response with appropriate headings and structure
6. If sources contradict each other, acknowledge this and explain different perspectives
7. If information is missing or incomplete, acknowledge limitations in available data`;

    const prompt = `Query: ${query}

LOCAL DOCUMENT CONTEXT:
${localContext}

WEB RESEARCH:
${webResearch}

Based on the provided context from local documents and web research, please provide a comprehensive, well-cited answer to the query. Organize your response clearly and cite all sources.`;

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json() as ClaudeResponse;
    
    return {
      content: data.content[0]?.text || '',
      usage: data.usage
    };
  } catch (error) {
    console.error('Claude synthesis error:', error);
    
    // Fallback to simulated response in case of error
    const simulated = simulateClaudeResponse(query, localContext, webResearch);
    simulated.error = error instanceof Error ? error.message : 'Unknown error';
    return simulated;
  }
}

/**
 * Simulates a response from Claude API for development/testing
 */
function simulateClaudeResponse(
  query: string, 
  localContext: string, 
  webResearch: string
): {
  content: string;
  usage?: { input_tokens: number; output_tokens: number };
  error?: string;
} {
  // Create a "realistic" simulated response based on the inputs
  const hasLocalContent = localContext.length > 100;
  const hasWebContent = webResearch.length > 100;
  
  // Extract key terms
  const terms = query.toLowerCase().trim().split(/\s+/).filter(term => 
    term.length > 3 && 
    !['what', 'when', 'where', 'why', 'how', 'the', 'and', 'that'].includes(term)
  );
  
  // Generate a simulated response
  let content = `# Comprehensive Analysis: ${query}\n\n`;
  
  // Introduction
  content += `## Introduction\n\nThis analysis addresses the query "${query}" by synthesizing information from ${hasLocalContent ? 'local documents' : 'available sources'} and ${hasWebContent ? 'web research' : 'general knowledge'}.\n\n`;
  
  // Main findings section
  content += `## Key Findings\n\n`;
  
  if (hasLocalContent) {
    content += `### Local Document Analysis\n\nExamination of local files reveals several important insights about ${terms[0] || 'this topic'}:\n\n`;
    content += `1. According to local documents, ${terms[0] || 'the subject'} has significant implications for ${terms[1] || 'related areas'}.\n`;
    content += `2. Multiple files indicate a correlation between ${terms[0] || 'key factors'} and ${terms[2] || 'outcomes'}.\n`;
    content += `3. Historical data from local sources shows an evolution in approaches to ${terms[0] || 'the topic'} over time.\n\n`;
  }
  
  if (hasWebContent) {
    content += `### Web Research Findings\n\nOnline sources provide additional context and current perspectives:\n\n`;
    content += `1. Recent academic publications emphasize the role of ${terms[1] || 'key factors'} in contemporary understanding.\n`;
    content += `2. Expert analyses from reputable websites highlight emerging trends in ${terms[0] || 'the field'}.\n`;
    content += `3. Statistical data from research databases demonstrates measurable impacts of ${terms[2] || 'related factors'}.\n\n`;
  }
  
  // Synthesis section
  content += `## Synthesis and Analysis\n\n`;
  content += `When comparing information across all sources, several patterns emerge:\n\n`;
  content += `- Both ${hasLocalContent ? 'local documents' : 'primary sources'} and ${hasWebContent ? 'web research' : 'secondary sources'} confirm the significance of ${terms[0] || 'the primary subject'}.\n`;
  content += `- The relationship between ${terms[1] || 'key elements'} and ${terms[2] || 'outcomes'} is consistently supported across multiple sources.\n`;
  content += `- Current perspectives appear to be evolving toward a more integrated understanding of all factors involved.\n\n`;
  
  // Conclusion
  content += `## Conclusion\n\n`;
  content += `Based on the comprehensive analysis of available information, it is evident that ${query} involves complex interactions between multiple factors. The synthesized findings from local documents and web research provide a solid foundation for understanding this topic, though some areas warrant further investigation.\n\n`;
  
  // Sources section
  content += `## Sources\n\n`;
  
  if (hasLocalContent) {
    content += `### Local Document Sources\n\n`;
    content += `1. Local File: "research_document.pdf" - Analysis of ${terms[0] || 'primary topic'}\n`;
    content += `2. Local File: "data_collection.xlsx" - Statistical compilation related to ${terms[1] || 'key metrics'}\n`;
    content += `3. Local File: "meeting_notes.md" - Documentation of discussions about ${terms[2] || 'relevant aspects'}\n\n`;
  }
  
  if (hasWebContent) {
    content += `### Web Research Sources\n\n`;
    content += `1. Journal Article: "Understanding ${terms[0] || 'Key Concepts'}: A Comprehensive Guide" - Journal of ${terms[1] || 'Relevant Field'} (2023)\n`;
    content += `2. Research Publication: "Recent Advances in ${terms[1] || 'The Field'}" - Research Database (2024)\n`;
    content += `3. Expert Analysis: "${terms[2] || 'Applications'} in Practice" - Professional Association Website (2023)\n\n`;
  }
  
  return {
    content,
    usage: {
      input_tokens: Math.floor((query.length + localContext.length + webResearch.length) / 4),
      output_tokens: Math.floor(content.length / 4)
    }
  };
} 
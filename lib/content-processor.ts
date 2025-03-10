/**
 * Content processing utilities for RAG
 */

/**
 * Processes file content for the RAG pipeline
 * - Extracts text 
 * - Formats content with metadata
 * - Prepares for embedding/retrieval
 */
export async function processFileContent(
  filePath: string, 
  content: string, 
  fileType: string
): Promise<{
  chunks: string[];
  metadata: any;
}> {
  // Extract file name and extension
  const fileName = filePath.split('/').pop() || '';
  const ext = fileType || fileName.split('.').pop() || '';
  
  // Process content based on file type
  let processedContent = content.trim();
  let chunks: string[] = [];
  let metadata: any = {
    source: filePath,
    fileName,
    fileType: ext,
    processed: new Date().toISOString()
  };
  
  // Create basic chunking - this can be enhanced in the future
  const chunkSize = 1000; // characters
  const overlap = 100;
  
  // For very short content, just use it as is
  if (processedContent.length < chunkSize) {
    chunks = [processedContent];
  } else {
    // Create overlapping chunks for longer content
    let i = 0;
    while (i < processedContent.length) {
      const end = Math.min(i + chunkSize, processedContent.length);
      const chunk = processedContent.substring(i, end);
      chunks.push(chunk);
      i += chunkSize - overlap;
    }
  }
  
  // For specific file types, we can add more specialized processing
  if (ext === '.md' || ext === '.markdown') {
    metadata.contentType = 'markdown';
  } else if (ext === '.html' || ext === '.htm') {
    metadata.contentType = 'html';
  } else if (ext === '.pdf') {
    metadata.contentType = 'pdf';
  } else if (ext === '.doc' || ext === '.docx') {
    metadata.contentType = 'document';
  } else if (ext === '.ppt' || ext === '.pptx') {
    metadata.contentType = 'presentation';
  } else {
    metadata.contentType = 'text';
  }
  
  return {
    chunks,
    metadata
  };
}

/**
 * Formats content for inclusion in the LLM context
 */
export function formatChunkForLLM(chunk: string, metadata: any): string {
  // Create a formatted context piece for the LLM
  return `
--- Begin Content from ${metadata.fileName} ---
Source: ${metadata.source}
Type: ${metadata.contentType}

${chunk}

--- End Content from ${metadata.fileName} ---
`;
}

/**
 * Creates a context window from multiple chunks, respecting a token budget
 */
export function createContextWindow(
  chunks: Array<{text: string; metadata: any}>, 
  maxTokens: number = 4000
): string {
  // Estimate: 1 token ≈ 4 characters for English text
  const charPerToken = 4;
  let totalChars = 0;
  let contextParts: string[] = [];
  
  // Add chunks until we approach the token limit
  for (const {text, metadata} of chunks) {
    const formatted = formatChunkForLLM(text, metadata);
    const estimatedTokens = formatted.length / charPerToken;
    
    if ((totalChars / charPerToken) + estimatedTokens > maxTokens) {
      break;
    }
    
    contextParts.push(formatted);
    totalChars += formatted.length;
  }
  
  return contextParts.join('\n\n');
} 
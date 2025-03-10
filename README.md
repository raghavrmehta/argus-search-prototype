# MacRAG Search

A powerful Mac search application that combines macOS Spotlight, RAG (Retrieval Augmented Generation), and AI for comprehensive search results.

## Features

- **macOS Spotlight Integration**: Search your Mac files using the powerful built-in Spotlight search API
- **Local File Context**: Select relevant files to include in the search context
- **Retrieval Augmented Generation**: Enhance AI responses with information from your local files
- **Web Research**: Parallel web search through Perplexity API
- **OCR Processing**: Extract text from images and scanned documents
- **Multi-Model Synthesis**: Choose between Claude 3.7 Sonnet or Gemini 1.5 Pro for synthesizing results
- **Results Storage**: Save search results in a local database for future reference

## How Spotlight Integration Works

The Spotlight integration uses the macOS command-line tools `mdfind` and `mdls` to access the Spotlight database. This provides:

1. Fast file search across your Mac
2. Metadata retrieval for found files
3. Content extraction from text-based files

When you perform a search:
- The app queries Spotlight for relevant files
- You can select which files to include in your search context
- Text from these files is extracted and fed into the AI synthesis process
- The final result cites all sources including local Spotlight files

## Getting Started

1. First, install the dependencies:

```bash
npm install
# or
yarn install
```

2. Make sure to grant the application necessary permissions in macOS:
   - Allow Terminal/iTerm2 to access your files
   - Allow access to Documents folder when prompted

3. Run the development server:

```bash
npm run dev
# or
yarn dev
```

## File Access Permission Requirements

For the Spotlight integration to work correctly, the app requires permission to:

1. Execute the `mdfind` and `mdls` commands (via `child_process`)
2. Read files in your home directory (for content extraction)

These permissions are handled by macOS security prompts when first accessing files.

## Notes for Developers

- The Spotlight API is accessed through server-side API endpoints
- File content is extracted using the Node.js `fs` module
- Security measures prevent access to files outside the user's home directory
- Content is only loaded for text-based files with safe extensions

## Technologies Used

- Next.js 15
- React 19
- Tailwind CSS
- Shadcn UI Components
- Node.js for command-line integration
- macOS Spotlight API 
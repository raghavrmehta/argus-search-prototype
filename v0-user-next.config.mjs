// Custom Next.js configuration for handling macOS Spotlight integration
export default {
  // Add server security headers to allow file system access
  experimental: {
    // Allow the serverless function to access the file system for Spotlight integration
    serverComponentsExternalPackages: ['fs', 'child_process'],
  }
}; 
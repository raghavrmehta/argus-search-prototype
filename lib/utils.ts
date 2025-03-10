import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Debug utility
export const debug = {
  log: (...args: any[]) => {
    if (typeof window !== 'undefined') {
      console.log('[Argus Debug]', ...args);
    }
  },
  error: (...args: any[]) => {
    if (typeof window !== 'undefined') {
      console.error('[Argus Error]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (typeof window !== 'undefined') {
      console.warn('[Argus Warning]', ...args);
    }
  }
};

// Format JSON with proper indentation and handling of circular references
export function formatJson(obj: any, indent = 2) {
  try {
    const cache: any[] = [];
    const formattedJson = JSON.stringify(
      obj,
      (key, value) => {
        if (typeof value === 'object' && value !== null) {
          // Handle circular references
          if (cache.includes(value)) {
            return '[Circular Reference]';
          }
          cache.push(value);
        }
        return value;
      },
      indent
    );
    return formattedJson;
  } catch (error) {
    return `Error formatting JSON: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Helper to safely parse JSON with error handling
export function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch (error) {
    debug.error('JSON parsing error:', error);
    return null;
  }
}

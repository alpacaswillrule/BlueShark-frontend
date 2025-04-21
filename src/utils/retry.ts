/**
 * Utility for implementing exponential backoff retry logic
 */

// Configuration for retry behavior
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Whether to add jitter to the delay */
  jitter: boolean;
  /** Function to determine if an error is retryable */
  isRetryable?: (error: any) => boolean;
  /** Callback function for retry attempts */
  onRetry?: (attempt: number, error: any, delayMs: number) => void;
}

// Default retry configuration
export const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  jitter: true,
  isRetryable: (error: any) => {
    // By default, retry network errors and 5xx server errors
    const isNetworkError = !error.response;
    const isServerError = error.response && error.response.status >= 500 && error.response.status < 600;
    const isRateLimited = error.response && error.response.status === 429;
    
    return isNetworkError || isServerError || isRateLimited;
  },
  onRetry: (attempt, error, delayMs) => {
    console.warn(`Retry attempt ${attempt} after ${delayMs}ms due to:`, error.message || error);
  }
};

/**
 * Adds jitter to a delay to prevent synchronized retries
 */
export function addJitter(delay: number): number {
  // Add random jitter between -25% and +25%
  const jitterFactor = 0.25;
  const jitterAmount = delay * jitterFactor;
  return delay + (Math.random() * jitterAmount * 2 - jitterAmount);
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(attempt: number, initialDelay: number, maxDelay: number, useJitter: boolean): number {
  // Calculate exponential backoff: initialDelay * 2^attempt
  const exponentialDelay = initialDelay * Math.pow(2, attempt);
  const delay = Math.min(exponentialDelay, maxDelay);
  
  return useJitter ? addJitter(delay) : delay;
}

/**
 * Executes a function with exponential backoff retry logic
 * 
 * @param fn The async function to execute with retries
 * @param config Retry configuration
 * @returns Promise that resolves with the function result or rejects after all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  // Merge provided config with defaults
  const retryConfig: RetryConfig = {
    ...defaultRetryConfig,
    ...config
  };
  
  let attempt = 0;
  let lastError: any;
  
  while (attempt <= retryConfig.maxRetries) {
    try {
      // Attempt to execute the function
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we've reached max retries
      if (attempt >= retryConfig.maxRetries) {
        break;
      }
      
      // Check if the error is retryable
      if (retryConfig.isRetryable && !retryConfig.isRetryable(error)) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delayMs = calculateBackoffDelay(
        attempt,
        retryConfig.initialDelayMs,
        retryConfig.maxDelayMs,
        retryConfig.jitter
      );
      
      // Call onRetry callback if provided
      if (retryConfig.onRetry) {
        retryConfig.onRetry(attempt + 1, error, delayMs);
      }
      
      // Wait for the calculated delay
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      // Increment attempt counter
      attempt++;
    }
  }
  
  // If we've exhausted all retries, throw the last error
  throw lastError;
}

/**
 * Request deduplication cache to prevent duplicate concurrent requests
 */
export class RequestCache {
  private cache: Map<string, Promise<any>> = new Map();
  
  /**
   * Execute a function with deduplication
   * 
   * @param cacheKey Unique key to identify the request
   * @param fn Function to execute
   * @param ttlMs Time-to-live in milliseconds for the cache entry
   * @returns Promise that resolves with the function result
   */
  async execute<T>(cacheKey: string, fn: () => Promise<T>, ttlMs: number = 5000): Promise<T> {
    // For requests with certain filter parameters, always execute the function
    if (cacheKey.includes('is_unisex') || 
        cacheKey.includes('is_accessible') || 
        cacheKey.includes('has_changing_table')) {
      console.log('Skipping cache for filter request:', cacheKey);
      return fn();
    }
    
    // Extract and normalize the cache key for requests with timestamps
    // This allows caching even when timestamps change, but within the same time window
    let normalizedCacheKey = cacheKey;
    if (cacheKey.includes('_t=')) {
      // Replace the timestamp with a placeholder to enable caching
      // The actual timestamp is still sent to the server, but we use a normalized key for caching
      normalizedCacheKey = cacheKey.replace(/(_t=)[^&:]*/, '$1NORMALIZED');
      console.log('Normalized cache key for timestamp request:', normalizedCacheKey);
    }
    
    // Check if we already have a pending request for this key
    if (this.cache.has(normalizedCacheKey)) {
      console.log('Using cached request for:', normalizedCacheKey);
      return this.cache.get(normalizedCacheKey) as Promise<T>;
    }
    
    // Create a new promise for this request
    const promise = fn().finally(() => {
      // Remove from cache after TTL
      setTimeout(() => {
        this.cache.delete(normalizedCacheKey);
      }, ttlMs);
    });
    
    // Store in cache
    this.cache.set(normalizedCacheKey, promise);
    
    return promise;
  }
  
  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Remove a specific entry from the cache
   */
  remove(cacheKey: string): void {
    this.cache.delete(cacheKey);
  }
}

// Create a singleton instance of the request cache
export const requestCache = new RequestCache();

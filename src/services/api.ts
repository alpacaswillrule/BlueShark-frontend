import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Bathroom, Review, FilterOptions, Location, Rating } from '../types';
import { retryWithBackoff, requestCache, RetryConfig } from '../utils/retry';

// Create an axios instance with the base URL
const api = axios.create({
  baseURL: 'http://localhost:8000/api', // FastAPI runs on port 8000
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track in-flight requests to prevent duplicates
const pendingRequests = new Map<string, Promise<any>>();

// Generate a unique key for a request based on method, url, and params/data
const getRequestKey = (config: AxiosRequestConfig): string => {
  const { method, url, params, data } = config;
  return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
};

// Custom retry configuration for different request types
const getRetryConfig = (config: AxiosRequestConfig): Partial<RetryConfig> => {
  // Default retry config
  const defaultConfig: Partial<RetryConfig> = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
  };

  // For GET requests, we can be more aggressive with retries
  if (config.method?.toLowerCase() === 'get') {
    return {
      ...defaultConfig,
      maxRetries: 5, // More retries for GET requests
    };
  }

  // For POST/PUT/DELETE requests, be more conservative
  return {
    ...defaultConfig,
    maxRetries: 2, // Fewer retries for mutation operations
    initialDelayMs: 2000, // Start with a longer delay
  };
};

// Add a request interceptor for deduplication
api.interceptors.request.use(
  async (config) => {
    // Only deduplicate GET requests
    if (config.method?.toLowerCase() === 'get' && config.url) {
      const requestKey = getRequestKey(config);
      
      // Check if we already have this exact request in flight
      if (pendingRequests.has(requestKey)) {
        console.log(`Deduplicating request: ${requestKey}`);
        
        // Create a new promise that will resolve/reject when the original request does
        const pendingRequest = pendingRequests.get(requestKey);
        
        // Cancel this request since we're going to use the pending one
        return {
          ...config,
          cancelToken: new axios.CancelToken((cancel) => {
            cancel(`Request deduplicated: ${requestKey}`);
          }),
        };
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor for error handling and retry logic
api.interceptors.response.use(
  (response) => {
    // Clear from pending requests map on success
    const requestKey = getRequestKey(response.config);
    pendingRequests.delete(requestKey);
    
    return response;
  },
  async (error: AxiosError) => {
    // Clear from pending requests map on error
    if (error.config) {
      const requestKey = getRequestKey(error.config);
      pendingRequests.delete(requestKey);
    }
    
    // Log the error for debugging
    console.error('API Error:', error.response?.data || error.message);
    
    return Promise.reject(error);
  }
);

// Helper function to execute API requests with retry logic
const executeWithRetry = async <T>(
  requestFn: () => Promise<AxiosResponse<T>>,
  config: AxiosRequestConfig
): Promise<T> => {
  const retryConfig = getRetryConfig(config);
  
  try {
    // Execute the request with retry logic
    const response = await retryWithBackoff(requestFn, retryConfig);
    return response.data;
  } catch (error) {
    console.error(`Failed after ${retryConfig.maxRetries} retries:`, error);
    throw error;
  }
};

// Helper function to execute GET requests with deduplication and retry
const executeGet = async <T>(
  url: string,
  config: AxiosRequestConfig = {}
): Promise<T> => {
  const requestKey = getRequestKey({ ...config, method: 'get', url });
  
  // Use the request cache for deduplication
  return requestCache.execute(
    requestKey,
    () => executeWithRetry<T>(() => api.get(url, config), { ...config, method: 'get', url }),
    30000 // Cache for 30 seconds to reduce API calls
  );
};

// Get bathrooms by location
export const getBathrooms = async (
  userLat: number,
  userLng: number,
  filters: FilterOptions
): Promise<Bathroom[]> => {
  try {
    console.group('🌐 [API] getBathrooms');
    console.log('Function called with parameters:', { 
      userLat, 
      userLng, 
      filters,
      timestamp: new Date().toISOString()
    });
    
    // Get default radius from environment variable or use fallback
    const defaultRadius = process.env.REACT_APP_DEFAULT_RADIUS 
      ? parseInt(process.env.REACT_APP_DEFAULT_RADIUS, 10) 
      : 5;
    
    // Send location and radius parameters to the backend
    const params: Record<string, any> = {
      latitude: userLat,
      longitude: userLng,
      radius: filters.radius || defaultRadius,
      limit: 100,
      // Use a timestamp that changes less frequently (every 30 seconds)
      // This allows for more effective caching while still ensuring data freshness
      _t: Math.floor(Date.now() / 30000)
    };
    
    console.log('Making API request to /bathrooms/ with params:', params);
    console.log('Full URL:', `http://localhost:8000/api/bathrooms/?${new URLSearchParams(params as any).toString()}`);
    
    const startTime = Date.now();
    
    // Use executeGet with deduplication and retry
    // Always use trailing slash to prevent 307 redirects
    const data = await executeGet<Bathroom[]>('/bathrooms/', { params });
    
    const endTime = Date.now();
    console.log(`API request completed in ${endTime - startTime}ms`);
    console.log('API response received with data length:', data.length);
    
    // Check if the response data is an array
    if (!Array.isArray(data)) {
      console.error('API response is not an array:', data);
      return [];
    }
    
    // Check if the bathrooms have valid coordinates
    const validBathrooms = data.filter(bathroom => {
      const hasValidCoords = 
        typeof bathroom.latitude === 'number' && 
        typeof bathroom.longitude === 'number' &&
        !isNaN(bathroom.latitude) && 
        !isNaN(bathroom.longitude);
      
      if (!hasValidCoords) {
        console.warn('Bathroom missing valid coordinates:', bathroom);
      }
      
      return hasValidCoords;
    });
    
    console.log(`Filtered ${data.length - validBathrooms.length} bathrooms with invalid coordinates`);
    console.log(`Returning ${validBathrooms.length} valid bathrooms`);
    console.groupEnd();
    
    return validBathrooms;
  } catch (error) {
    console.error('Error getting bathrooms:', error);
    console.groupEnd();
    return [];
  }
};

// Get a specific bathroom by ID
export const getBathroom = async (bathroomId: number): Promise<Bathroom | null> => {
  try {
    // Use executeGet with deduplication and retry
    // Always use trailing slash to prevent 307 redirects
    return await executeGet<Bathroom>(`/bathrooms/${bathroomId}/`);
  } catch (error) {
    console.error(`Error getting bathroom with ID ${bathroomId}:`, error);
    return null;
  }
};

// Create a new bathroom
export const createBathroom = async (bathroomData: {
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  is_unisex?: boolean;
  is_accessible?: boolean;
  has_changing_table?: boolean;
  directions?: string;
  comment?: string;
  external_id?: string;
  external_source?: string;
}): Promise<Bathroom | null> => {
  try {
    // Use executeWithRetry for POST request
    // Always use trailing slash to prevent 307 redirects
    return await executeWithRetry<Bathroom>(
      () => api.post('/bathrooms/', bathroomData),
      { method: 'post', url: '/bathrooms/', data: bathroomData }
    );
  } catch (error) {
    console.error('Error creating bathroom:', error);
    return null;
  }
};

// Update an existing bathroom
export const updateBathroom = async (
  bathroomId: number,
  bathroomData: Partial<Bathroom>
): Promise<Bathroom | null> => {
  try {
    // Use executeWithRetry for PUT request
    // Always use trailing slash to prevent 307 redirects
    return await executeWithRetry<Bathroom>(
      () => api.put(`/bathrooms/${bathroomId}/`, bathroomData),
      { method: 'put', url: `/bathrooms/${bathroomId}/`, data: bathroomData }
    );
  } catch (error) {
    console.error(`Error updating bathroom with ID ${bathroomId}:`, error);
    return null;
  }
};

// Delete a bathroom
export const deleteBathroom = async (bathroomId: number): Promise<boolean> => {
  try {
    // Use executeWithRetry for DELETE request
    // Always use trailing slash to prevent 307 redirects
    const response = await executeWithRetry<any>(
      () => api.delete(`/bathrooms/${bathroomId}/`),
      { method: 'delete', url: `/bathrooms/${bathroomId}/` }
    );
    
    return response.status === 204 || response === '';
  } catch (error) {
    console.error(`Error deleting bathroom with ID ${bathroomId}:`, error);
    return false;
  }
};

// Get reviews for a specific bathroom
export const getReviews = async (bathroomId: number, limit: number = 10): Promise<Review[]> => {
  try {
    // Use executeGet with deduplication and retry
    // Always use trailing slash to prevent 307 redirects
    return await executeGet<Review[]>(`/reviews/${bathroomId}/`, {
      params: { limit }
    });
  } catch (error) {
    console.error(`Error getting reviews for bathroom with ID ${bathroomId}:`, error);
    return [];
  }
};

// Submit a new review
export const createReview = async (reviewData: {
  bathroom_id: number;
  rating: number;
  comment?: string;
  directions?: string;
}): Promise<Review | null> => {
  try {
    // Use executeWithRetry for POST request
    // Always use trailing slash to prevent 307 redirects
    return await executeWithRetry<Review>(
      () => api.post('/reviews/', reviewData),
      { method: 'post', url: '/reviews/', data: reviewData }
    );
  } catch (error) {
    console.error('Error creating review:', error);
    return null;
  }
};

// ===== LEGACY FUNCTIONS FOR BACKWARD COMPATIBILITY =====

// Legacy function to get locations (maps to getBathrooms)
export const getLocations = async (
  filters: any,
  userLat?: number,
  userLng?: number,
  includeExternal: boolean = true
): Promise<Location[]> => {
  try {
    if (!userLat || !userLng) {
      return [];
    }
    
    // Map old filters to new filters
    const newFilters: FilterOptions = {
      radius: filters.radius || 2.0
    };
    
    // Only get restrooms if type filter is 'restroom' or null
    if (filters.type && filters.type !== 'restroom') {
      return [];
    }
    
    const bathrooms = await getBathrooms(userLat, userLng, newFilters);
    
    // Convert Bathroom objects to Location objects
    return bathrooms.map(bathroom => ({
      id: bathroom.id.toString(),
      name: bathroom.name,
      type: 'restroom',
      address: bathroom.address,
      lat: bathroom.latitude,
      lng: bathroom.longitude,
      positive_count: Math.round(bathroom.average_rating * bathroom.total_ratings / 5),
      neutral_count: Math.round(bathroom.total_ratings / 5),
      negative_count: Math.round((5 - bathroom.average_rating) * bathroom.total_ratings / 5),
      total_ratings: bathroom.total_ratings,
      source: bathroom.external_source,
      external_id: bathroom.external_id,
      ada_accessible: bathroom.is_accessible,
      unisex: bathroom.is_unisex,
      last_updated: new Date(bathroom.updated_at).getTime()
    }));
  } catch (error) {
    console.error('Error in legacy getLocations:', error);
    return [];
  }
};

// Legacy function to get ratings (maps to getReviews)
export const getRatings = async (locationId: string): Promise<Rating[]> => {
  try {
    const bathroomId = parseInt(locationId, 10);
    if (isNaN(bathroomId)) {
      return [];
    }
    
    const reviews = await getReviews(bathroomId);
    
    // Convert Review objects to Rating objects
    return reviews.map(review => ({
      id: review.id.toString(),
      location_id: review.bathroom_id.toString(),
      sentiment: review.rating >= 4 ? 'positive' : (review.rating >= 2 ? 'neutral' : 'negative'),
      comment: review.comment,
      timestamp: new Date(review.created_at).getTime(),
      bathroom_id: review.bathroom_id,
      rating: review.rating,
      created_at: review.created_at,
      user_id: review.user_id
    }));
  } catch (error) {
    console.error('Error in legacy getRatings:', error);
    return [];
  }
};

// Legacy function to submit a rating (maps to createReview or createBathroom + createReview)
export const submitRating = async (
  rating: Omit<Rating, 'id' | 'timestamp'>,
  isNewLocation: boolean = false,
  locationData?: Partial<Location>
): Promise<boolean> => {
  try {
    if (isNewLocation && locationData) {
      // Create a new bathroom first
      const newBathroom = await createBathroom({
        name: locationData.name || 'Unknown',
        address: locationData.address,
        latitude: locationData.lat || 0,
        longitude: locationData.lng || 0,
        is_unisex: locationData.unisex,
        is_accessible: locationData.ada_accessible,
        external_id: locationData.external_id,
        external_source: locationData.source
      });
      
      if (!newBathroom) {
        return false;
      }
      
      // Then create a review for the new bathroom
      const newReview = await createReview({
        bathroom_id: newBathroom.id,
        rating: rating.sentiment === 'positive' ? 5 : (rating.sentiment === 'neutral' ? 3 : 1),
        comment: rating.comment
      });
      
      return !!newReview;
    } else {
      // Just create a review for an existing bathroom
      const bathroomId = parseInt(rating.location_id, 10);
      if (isNaN(bathroomId)) {
        return false;
      }
      
      const newReview = await createReview({
        bathroom_id: bathroomId,
        rating: rating.sentiment === 'positive' ? 5 : (rating.sentiment === 'neutral' ? 3 : 1),
        comment: rating.comment
      });
      
      return !!newReview;
    }
  } catch (error) {
    console.error('Error in legacy submitRating:', error);
    return false;
  }
};

export interface Bathroom {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  is_unisex: boolean;
  is_accessible: boolean;
  has_changing_table: boolean;
  directions?: string;
  comment?: string;
  average_rating: number;
  total_ratings: number;
  external_id?: string;
  external_source?: string;
  created_at: string;
  updated_at: string;
  // Internal tracking properties
  _fetchTimestamp?: number;
}

export interface Review {
  id: number;
  bathroom_id: number;
  rating: number; // 1-5 rating
  comment?: string;
  directions?: string;
  created_at: string;
  user_id?: number | null;
}

export interface FilterOptions {
  radius: number; // in kilometers
  rating_min?: number; // Now fully optional as we've removed it from the UI
  is_unisex?: boolean;
  is_accessible?: boolean;
  has_changing_table?: boolean;
}

// For backward compatibility during transition
export interface Location {
  id: string;
  name: string;
  type: string; // 'restroom', 'restaurant', or 'police'
  address: string;
  lat: number;
  lng: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  total_ratings: number;
  source?: string; // 'user', 'refuge_restrooms', 'goweewee', 'csv'
  external_id?: string; // ID from external source
  ada_accessible?: boolean; // For restrooms
  unisex?: boolean; // For restrooms
  last_updated?: number; // Timestamp
}

// For backward compatibility during transition
export interface Rating {
  id: string;
  location_id: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  comment?: string;
  timestamp: number;
  // Additional fields from Review for internal use
  bathroom_id?: number;
  rating?: number;
  created_at?: string;
  user_id?: number | null;
}

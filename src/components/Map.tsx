import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import { Bathroom, Review, FilterOptions } from '../types';
import { getBathrooms, getReviews } from '../services/api';
import '../styles/InfoWindow.css';

// Get Google Maps API key from environment variables
const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
console.log('Google Maps API Key:', googleMapsApiKey ? 'Key is set' : 'Key is NOT set');

// Map container style
const containerStyle = {
  width: '100%',
  height: '100%'
};

// Default center (can be updated with user's location)
const defaultCenter = {
  lat: 42.3601, // Boston
  lng: -71.0589
};

// Custom map styles for Blue Shark theme
const mapStyles = [
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#ADD8E6' }] // Light blue water
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }] // White landscape
  },
  {
    featureType: 'poi',
    elementType: 'labels.icon',
    stylers: [{ color: '#FFC0CB' }] // Pink POI icons
  },
  {
    featureType: 'transit',
    elementType: 'labels.icon',
    stylers: [{ color: '#FFC0CB' }] // Pink transit icons
  }
];

interface MapProps {
  filters: FilterOptions;
}

const Map: React.FC<MapProps> = ({ filters }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  // Store all unfiltered bathrooms (commented out as it's currently unused)
  // const [allBathrooms, setAllBathrooms] = useState<Bathroom[]>([]);
  const [bathrooms, setBathrooms] = useState<Bathroom[]>([]); // Store filtered bathrooms for display
  const [selectedBathroom, setSelectedBathroom] = useState<Bathroom | null>(null);
  const [bathroomReviews, setBathroomReviews] = useState<Review[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [droppedPinLocation, setDroppedPinLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showRadiusCircle, setShowRadiusCircle] = useState<boolean>(false);
  const [apiError, setApiError] = useState<Error | null>(null);
  
  // Use a ref to track if we've already loaded bathrooms
  const bathroomsLoadedRef = useRef<boolean>(false);
  
  // Use a ref to store all bathrooms we've ever received
  const allBathroomsRef = useRef<Record<string, Bathroom>>({});
  
  // Track if initial load has happened
  const initialLoadRef = useRef<boolean>(false);
  
  // Debug re-renders
  useEffect(() => {
    console.log('Map component rendered');
  });
  
  // Debug filter props changes
  useEffect(() => {
    console.group('🗺️ [MAP] Filters Prop Changed');
    console.log('Received new filters prop:', filters);
    console.log('Filter values explicitly:', {
      radius: filters.radius,
      is_unisex: filters.is_unisex,
      is_accessible: filters.is_accessible,
      has_changing_table: filters.has_changing_table
    });
    console.groupEnd();
  }, [filters]);

  // Calculate distance between two points using Haversine formula
  // Commented out as it's currently unused
  /*
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;  // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;  // Distance in km
    return distance;
  }, []);
  */

  // Function to filter bathrooms based on current filters
  const filterBathrooms = useCallback(() => {
    console.group('🗺️ [MAP] Filtering Bathrooms');
    console.log('Current filters:', filters);
    console.log('Filter values explicitly:', {
      radius: filters.radius,
      is_unisex: filters.is_unisex,
      is_accessible: filters.is_accessible,
      has_changing_table: filters.has_changing_table
    });
    
    // Get all bathrooms from cache
    const allBathrooms = Object.values(allBathroomsRef.current);
    console.log(`Total bathrooms in cache: ${allBathrooms.length}`);
    
    // Log bathroom properties for debugging
    if (allBathrooms.length > 0) {
      console.log('Sample bathroom properties:', {
        is_unisex: allBathrooms[0].is_unisex,
        is_accessible: allBathrooms[0].is_accessible,
        has_changing_table: allBathrooms[0].has_changing_table
      });
    }
    
    // Store all bathrooms for reference (commented out as setAllBathrooms is unused)
    // setAllBathrooms(allBathrooms);
    
    // Apply filters
    let filteredBathrooms = [...allBathrooms];
    console.log(`Starting with ${filteredBathrooms.length} bathrooms`);
    
    // Apply unisex filter if specified (undefined means "any")
    if (filters.is_unisex !== undefined) {
      console.log(`Applying unisex filter: ${filters.is_unisex}`);
      const beforeCount = filteredBathrooms.length;
      
      filteredBathrooms = filteredBathrooms.filter(bathroom => {
        const matches = bathroom.is_unisex === filters.is_unisex;
        if (!matches) {
          console.log(`Bathroom ${bathroom.id} excluded: is_unisex=${bathroom.is_unisex}, filter=${filters.is_unisex}`);
        }
        return matches;
      });
      
      console.log(`After is_unisex filter: ${filteredBathrooms.length}/${beforeCount} bathrooms remain`);
    } else {
      console.log('Unisex filter not applied (Any)');
    }
    
    // Apply accessible filter if specified (undefined means "any")
    if (filters.is_accessible !== undefined) {
      console.log(`Applying accessible filter: ${filters.is_accessible}`);
      const beforeCount = filteredBathrooms.length;
      
      filteredBathrooms = filteredBathrooms.filter(bathroom => {
        const matches = bathroom.is_accessible === filters.is_accessible;
        if (!matches) {
          console.log(`Bathroom ${bathroom.id} excluded: is_accessible=${bathroom.is_accessible}, filter=${filters.is_accessible}`);
        }
        return matches;
      });
      
      console.log(`After is_accessible filter: ${filteredBathrooms.length}/${beforeCount} bathrooms remain`);
    } else {
      console.log('Accessible filter not applied (Any)');
    }
    
    // Apply changing table filter if specified (undefined means "any")
    if (filters.has_changing_table !== undefined) {
      console.log(`Applying changing table filter: ${filters.has_changing_table}`);
      const beforeCount = filteredBathrooms.length;
      
      filteredBathrooms = filteredBathrooms.filter(bathroom => {
        const matches = bathroom.has_changing_table === filters.has_changing_table;
        if (!matches) {
          console.log(`Bathroom ${bathroom.id} excluded: has_changing_table=${bathroom.has_changing_table}, filter=${filters.has_changing_table}`);
        }
        return matches;
      });
      
      console.log(`After has_changing_table filter: ${filteredBathrooms.length}/${beforeCount} bathrooms remain`);
    } else {
      console.log('Changing table filter not applied (Any)');
    }
    
    console.log(`Final filtered bathrooms: ${filteredBathrooms.length}/${allBathrooms.length}`);
    
    // Update the displayed bathrooms
    console.log('Updating bathrooms state with filtered results');
    setBathrooms(filteredBathrooms);
    console.groupEnd();
  }, [filters]);

  // Function to fetch bathrooms
  const fetchBathrooms = useCallback(async (forceRefresh: boolean = false) => {
    console.group('🗺️ [MAP] Fetch Bathrooms');
    console.log('Parameters:', { 
      filters, 
      forceRefresh,
      currentCacheSize: Object.keys(allBathroomsRef.current).length
    });
    
    // Skip if already loading
    if (isLoading) {
      console.log('⚠️ Already loading bathrooms, skipping fetch');
      console.groupEnd();
      return;
    }
    
    // Use dropped pin location if available, otherwise use user location
    const searchLocation = droppedPinLocation || userLocation;
    console.log('Search location:', searchLocation);
    
    // Skip if we don't have a location to search from
    if (!searchLocation) {
      console.log('⚠️ No search location available, skipping fetch');
      console.groupEnd();
      return;
    }
    
    console.log('✅ Proceeding with API call');
    
    // Only clear cache if force refresh is requested
    if (forceRefresh) {
      console.log('Force refresh requested, clearing bathroom cache');
      allBathroomsRef.current = {};
    }
    
    // Reset state
    setIsLoading(true);
    setApiError(null);
    
    try {
      console.log('=== FETCH BATHROOMS START ===');
      console.log('Fetching bathrooms with search location:', searchLocation);
      console.log('Filters (radius only):', { radius: filters.radius });
      
      // Fetch new data from API (only using radius filter, other filters applied on frontend)
      const newData = await getBathrooms(searchLocation.lat, searchLocation.lng, filters);
      
      // Mark that we've loaded bathrooms
      bathroomsLoadedRef.current = true;
      initialLoadRef.current = true;
      
      console.log(`Bathrooms fetched: ${newData.length} total bathrooms`);
      
      // Check for valid coordinates
      const validBathrooms = newData.filter(bathroom => 
        typeof bathroom.latitude === 'number' && 
        typeof bathroom.longitude === 'number' && 
        !isNaN(bathroom.latitude) && 
        !isNaN(bathroom.longitude)
      );
      
      console.log(`Bathrooms with valid coordinates: ${validBathrooms.length}/${newData.length}`);
      
      if (validBathrooms.length < newData.length) {
        console.warn('Some bathrooms have invalid coordinates!');
        console.warn('Invalid bathrooms:', newData.filter(bathroom => 
          typeof bathroom.latitude !== 'number' || 
          typeof bathroom.longitude !== 'number' || 
          isNaN(bathroom.latitude) || 
          isNaN(bathroom.longitude)
        ));
      }
      
      // If we got valid data, update our cache
      if (validBathrooms.length > 0) {
        // Add timestamp to each bathroom
        const timestampedBathrooms = validBathrooms.map(bathroom => ({
          ...bathroom,
          _fetchTimestamp: Date.now()
        }));
        
        // Convert array to record for easier merging
        const newBathroomsRecord = timestampedBathrooms.reduce((acc, bathroom) => {
          acc[bathroom.id.toString()] = bathroom;
          return acc;
        }, {} as Record<string, Bathroom>);
        
        // Merge with existing cache
        allBathroomsRef.current = {
          ...allBathroomsRef.current,
          ...newBathroomsRecord
        };
        
        console.log(`Cache now contains ${Object.keys(allBathroomsRef.current).length} bathrooms`);
      }
    } catch (error) {
      console.error('Error fetching bathrooms:', error);
      
      // Set API error state
      setApiError(error instanceof Error ? error : new Error('Unknown error fetching bathrooms'));
      
      // Log the error for debugging
      console.warn('API error when fetching bathrooms:', error instanceof Error ? error.message : error);
    }
    
    console.log('=== FETCH BATHROOMS END ===');
    
    // Apply filters to the fetched data
    filterBathrooms();
    
    // Reset loading state
    setIsLoading(false);
  }, [filters, userLocation, droppedPinLocation, isLoading, filterBathrooms]);
  
  // Function to clear the cache and refresh data
  const refreshData = useCallback(() => {
    console.log('Manually refreshing data and clearing cache');
    allBathroomsRef.current = {};
    fetchBathrooms(true);
  }, [fetchBathrooms]);

  // Store previous radius to detect changes
  const prevRadiusRef = useRef<number>(10); // Default to match initial radius
  
  // Effect to handle filter changes - distinguish between radius and feature filters
  useEffect(() => {
    console.group('🗺️ [MAP] Filter Change Effect');
    console.log('Current filters:', filters);
    
    // Skip on first render
    if (!initialLoadRef.current && !userLocation) {
      console.log('Skipping filter effect (initial render or no user location)');
      console.log('initialLoadRef.current:', initialLoadRef.current);
      console.log('userLocation:', userLocation);
      console.groupEnd();
      return;
    }
    
    // Check if any bathrooms are loaded
    const hasBathrooms = Object.keys(allBathroomsRef.current).length > 0;
    console.log('Has bathrooms in cache:', hasBathrooms);
    
    // Check if we have a search location
    const searchLocation = droppedPinLocation || userLocation;
    if (!searchLocation) {
      console.log('No search location available, skipping filter effect');
      console.groupEnd();
      return;
    }
    
    // Check if radius has changed
    const radiusChanged = prevRadiusRef.current !== filters.radius;
    console.log('Previous radius:', prevRadiusRef.current);
    console.log('Current radius:', filters.radius);
    console.log('Radius changed:', radiusChanged);
    
    // Update the previous radius ref for next comparison
    prevRadiusRef.current = filters.radius;
    
    if (radiusChanged || !hasBathrooms) {
      // If radius changed or no bathrooms, fetch new data from API
      console.log('Radius changed or no bathrooms, fetching new data');
      fetchBathrooms(true);
    } else {
      // If only feature filters changed and we have bathrooms, just apply filters locally
      console.log('Only feature filters changed, applying filters locally');
      filterBathrooms();
    }
    
    console.groupEnd();
  }, [filters, droppedPinLocation, userLocation, fetchBathrooms, filterBathrooms]);
  
  // Initial load when user location is available
  useEffect(() => {
    console.group('🗺️ [MAP] Initial Load Effect');
    console.log('User location:', userLocation);
    console.log('initialLoadRef.current:', initialLoadRef.current);
    console.log('isLoading:', isLoading);
    
    if (userLocation && !initialLoadRef.current && !isLoading) {
      console.log('✅ Conditions met for initial load');
      console.log('Using user location:', userLocation);
      fetchBathrooms(false);
    } else {
      console.log('⚠️ Skipping initial load');
      if (!userLocation) console.log('Reason: No user location available');
      if (initialLoadRef.current) console.log('Reason: Initial load already happened');
      if (isLoading) console.log('Reason: Already loading');
    }
    
    console.groupEnd();
  }, [userLocation, fetchBathrooms, isLoading]);
  
  // Handle dropped pin changes
  useEffect(() => {
    console.group('🗺️ [MAP] Dropped Pin Effect');
    console.log('Dropped pin location:', droppedPinLocation);
    
    if (droppedPinLocation) {
      console.log('✅ Pin location changed, updating radius circle and fetching bathrooms');
      console.log('Setting showRadiusCircle to true');
      setShowRadiusCircle(true);
      
      // Fetch bathrooms with the new pin location
      fetchBathrooms(true);
    } else {
      console.log('No pin dropped, skipping effect');
    }
    
    console.groupEnd();
  }, [droppedPinLocation, fetchBathrooms]);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          console.log('Error getting location');
        }
      );
    }
  }, []);

  // Fetch reviews when a bathroom is selected
  useEffect(() => {
    const fetchBathroomReviews = async () => {
      if (!selectedBathroom) return;
      
      try {
        // Try to fetch reviews from API
        const reviews = await getReviews(selectedBathroom.id);
        
        // Set the reviews (even if empty)
        setBathroomReviews(reviews);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        // Set empty reviews array on error
        setBathroomReviews([]);
      }
    };

    fetchBathroomReviews();
  }, [selectedBathroom]);

  // Handle map click to drop a pin
  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const newPinLocation = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      console.log('Pin dropped at:', newPinLocation);
      setDroppedPinLocation(newPinLocation);
    }
  }, []);
  
  // Clear the dropped pin
  const clearDroppedPin = useCallback(() => {
    setDroppedPinLocation(null);
    setShowRadiusCircle(false);
  }, []);

  const onLoad = useCallback((map: google.maps.Map) => {
    map.setOptions({
      styles: mapStyles
    });
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    // Clean up Google Maps resources
    if (map && window.google?.maps?.event) {
      // Remove all event listeners
      window.google.maps.event.clearInstanceListeners(map);
    }
    
    // Clear state
    setMap(null);
    setBathrooms([]);
    setSelectedBathroom(null);
    setBathroomReviews([]);
  }, [map]);

  // Get marker icon for bathroom
  const getBathroomMarkerIcon = (bathroom: Bathroom): google.maps.Icon => {
    // Use the restroom icon from the custom_icons folder
    const iconPath = '/custom_icons/restroom.png';
    
    // For user-submitted bathrooms, make the icons larger
    const isUserSubmitted = bathroom.external_source === 'user-submitted' || !bathroom.external_source;
    const size = isUserSubmitted ? 50 : 40;
    
    return {
      url: iconPath,
      scaledSize: new google.maps.Size(size, size),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(size/2, size/2)
    };
  };

  // Render the map
  return isLoaded ? (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Bathroom count indicator */}
      <div 
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 1000,
          backgroundColor: 'white',
          borderRadius: '4px',
          padding: '8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <span style={{ fontWeight: 'bold' }}>
          Showing: {bathrooms.length} Bathrooms within {filters.radius} km
        </span>
      </div>

      {/* Refresh button */}
      <div 
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          backgroundColor: 'white',
          borderRadius: '4px',
          padding: '8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          cursor: isLoading ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isLoading ? 0.7 : 1
        }}
        onClick={isLoading ? undefined : refreshData}
        title={isLoading ? "Loading..." : "Refresh bathrooms"}
      >
        <span 
          role="img" 
          aria-label="refresh" 
          style={{ 
            fontSize: '20px',
            animation: isLoading ? 'spin 1s linear infinite' : 'none'
          }}
        >
          🔄
        </span>
        <span style={{ marginLeft: '5px', fontWeight: 'bold' }}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </span>
      </div>
      
      {/* Add CSS animation for the loading spinner */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      
      {/* Clear pin button */}
      {droppedPinLocation && (
        <div 
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            zIndex: 1000,
            backgroundColor: 'white',
            borderRadius: '4px',
            padding: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={clearDroppedPin}
          title="Clear dropped pin"
        >
          <span style={{ fontWeight: 'bold' }}>
            Clear Pin
          </span>
        </div>
      )}
      
      {/* Instructions for pin dropping */}
      {!droppedPinLocation && (
        <div 
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            zIndex: 1000,
            backgroundColor: 'white',
            borderRadius: '4px',
            padding: '8px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            maxWidth: '250px'
          }}
        >
          <span style={{ fontWeight: 'bold' }}>
            Click anywhere on the map to drop a pin and search for bathrooms in that area
          </span>
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: '15px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            zIndex: 2000,
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>
            <span
              role="img"
              aria-label="loading"
              style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}
            >
              🔄
            </span>
          </div>
          <h3 style={{ margin: '0' }}>Loading Bathrooms...</h3>
        </div>
      )}
      
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={droppedPinLocation || userLocation || defaultCenter}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
      >
        {/* User location marker */}
        {userLocation && !droppedPinLocation && (
          <Marker
            key="user-location"
            position={userLocation}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
              scaledSize: new google.maps.Size(40, 40),
              origin: new google.maps.Point(0, 0),
              anchor: new google.maps.Point(20, 40)
            }}
            onClick={() => console.log('User location clicked')}
          />
        )}
        
        {/* Dropped pin marker */}
        {droppedPinLocation && (
          <Marker
            key="dropped-pin"
            position={droppedPinLocation}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
              scaledSize: new google.maps.Size(40, 40),
              origin: new google.maps.Point(0, 0),
              anchor: new google.maps.Point(20, 40)
            }}
            onClick={() => console.log('Dropped pin clicked')}
          />
        )}
        
        {/* Radius circle around dropped pin */}
        {showRadiusCircle && droppedPinLocation && (
          <Circle
            center={droppedPinLocation}
            radius={filters.radius * 1000} // Convert km to meters
            options={{
              fillColor: 'rgba(66, 133, 244, 0.2)',
              fillOpacity: 0.35,
              strokeColor: 'rgba(66, 133, 244, 0.8)',
              strokeOpacity: 0.8,
              strokeWeight: 2
            }}
          />
        )}
        
        {/* Render bathroom markers */}
        {bathrooms.length > 0 ? (
          bathrooms.map((bathroom, index) => {
            // Skip bathrooms with invalid coordinates
            if (typeof bathroom.latitude !== 'number' || 
                typeof bathroom.longitude !== 'number' || 
                isNaN(bathroom.latitude) || 
                isNaN(bathroom.longitude)) {
              console.warn(`Skipping marker ${index} due to invalid coordinates:`, bathroom);
              return null;
            }
            
            // Get the icon for this bathroom
            const icon = getBathroomMarkerIcon(bathroom);
            
            return (
              <Marker
                key={bathroom.id.toString()}
                position={{ lat: bathroom.latitude, lng: bathroom.longitude }}
                icon={icon}
                zIndex={1000} // Ensure markers are on top
                onClick={() => {
                  console.log('Marker clicked:', bathroom);
                  setSelectedBathroom(bathroom);
                }}
              />
            );
          })
        ) : (
          !isLoading && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                zIndex: 1000,
                textAlign: 'center',
                maxWidth: '80%'
              }}
            >
              <h3 style={{ margin: '0 0 10px 0' }}>No Bathrooms Found</h3>
              <p style={{ margin: '0' }}>
                {apiError 
                  ? 'There was an error fetching bathrooms. Please try again later.' 
                  : 'No bathrooms found in this area. Try adjusting your filters or searching in a different location.'}
              </p>
            </div>
          )
        )}

        {/* Render info window for selected bathroom */}
        {selectedBathroom && (
          <InfoWindow
            position={{ lat: selectedBathroom.latitude, lng: selectedBathroom.longitude }}
            onCloseClick={() => setSelectedBathroom(null)}
          >
            <div className="info-window">
              <h3>{selectedBathroom.name}</h3>
              <p>{selectedBathroom.address}</p>
              
              {selectedBathroom.external_source && (
                <div className="source-tag">
                  Source: {selectedBathroom.external_source.replace('_', ' ')}
                </div>
              )}
              
              <div className="bathroom-details">
                {selectedBathroom.is_accessible && <div className="tag ada">ADA Accessible</div>}
                {selectedBathroom.is_unisex && <div className="tag unisex">Unisex</div>}
                {selectedBathroom.has_changing_table && <div className="tag changing-table">Changing Table</div>}
              </div>
              
              {selectedBathroom.directions && (
                <div className="directions">
                  <strong>Directions:</strong> {selectedBathroom.directions}
                </div>
              )}
              
              <p>
                Rating: {selectedBathroom.average_rating.toFixed(1)} / 5
                ({selectedBathroom.total_ratings} ratings)
              </p>
              
              <h4>Recent Comments:</h4>
              <div className="comments">
                {bathroomReviews.length > 0 ? (
                  bathroomReviews
                    .filter(review => review.comment)
                    .slice(0, 3)
                    .map(review => (
                      <div key={review.id} className="comment">
                        <div className="rating">
                          Rating: {review.rating}/5
                        </div>
                        <div className="comment-text">{review.comment}</div>
                      </div>
                    ))
                ) : (
                  <p>No reviews available for this bathroom. Be the first to leave a review!</p>
                )}
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  ) : (
    <div>Loading Map...</div>
  );
};

export default Map;

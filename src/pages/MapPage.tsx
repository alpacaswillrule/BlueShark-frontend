import React, { useState, useEffect, useRef } from 'react';
import MapComponent from '../components/Map';
import { FilterOptions } from '../types';
import '../styles/MapPage.css';

const MapPage: React.FC = () => {
  // Get default radius from environment variable or use fallback
  const defaultRadius = process.env.REACT_APP_DEFAULT_RADIUS 
    ? parseInt(process.env.REACT_APP_DEFAULT_RADIUS, 10) 
    : 5;
  
  // Use a key to force re-render of the Map component
  const [mapKey, setMapKey] = useState<number>(0);
  
  // Simplified filters with only radius
  const [filters] = useState<FilterOptions>({
    radius: defaultRadius
  });
  
  // Track if component is mounted
  const isMounted = useRef(true);
  
  // Set up cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Mark component as unmounted
      isMounted.current = false;
      
      // Remove any global event listeners that might have been added by Google Maps
      const googleMaps = window.google?.maps;
      if (googleMaps && googleMaps.event) {
        googleMaps.event.clearListeners(window, 'resize');
      }
    };
  }, []);

  return (
    <div className="map-page">
      <div className="map-container">
        {/* Use key to force re-render when needed */}
        <MapComponent 
          key={mapKey} 
          filters={filters} 
        />
      </div>
    </div>
  );
};

export default MapPage;

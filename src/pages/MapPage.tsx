import React, { useState, useEffect, useRef } from 'react';
import MapComponent from '../components/Map';
import FilterControls from '../components/FilterControls';
import { FilterOptions } from '../types';
import '../styles/MapPage.css';

const MapPage: React.FC = () => {
  // Use a key to force re-render of the Map component
  const [mapKey, setMapKey] = useState<number>(0);
  
  const [filters, setFilters] = useState<FilterOptions>({
    radius: 10,
    rating_min: 0,
    is_unisex: undefined,
    is_accessible: undefined,
    has_changing_table: undefined
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

  // Simplified filter change handler - always update filters and force map re-render
  const handleFilterChange = (newFilters: FilterOptions) => {
    if (isMounted.current) {
      console.group('📄 [MAP-PAGE] Filter Change Handler');
      console.log('Received new filters:', newFilters);
      console.log('Current filters:', filters);
      
      // Check if filters actually changed
      const hasChanged = 
        newFilters.radius !== filters.radius ||
        newFilters.is_unisex !== filters.is_unisex ||
        newFilters.is_accessible !== filters.is_accessible ||
        newFilters.has_changing_table !== filters.has_changing_table;
      
      console.log('Have filters changed?', hasChanged);
      
      if (hasChanged) {
        console.log('Filters have changed, updating state');
        
        // Log specific changes
        if (newFilters.radius !== filters.radius) {
          console.log(`Radius changed: ${filters.radius} → ${newFilters.radius}`);
        }
        if (newFilters.is_unisex !== filters.is_unisex) {
          console.log(`Unisex changed: ${filters.is_unisex} → ${newFilters.is_unisex}`);
        }
        if (newFilters.is_accessible !== filters.is_accessible) {
          console.log(`Accessible changed: ${filters.is_accessible} → ${newFilters.is_accessible}`);
        }
        if (newFilters.has_changing_table !== filters.has_changing_table) {
          console.log(`Changing table changed: ${filters.has_changing_table} → ${newFilters.has_changing_table}`);
        }
        
        // Update filters state
        setFilters(newFilters);
        
        // Force map re-render by updating mapKey
        console.log('Forcing map re-render by updating mapKey');
        setMapKey(prevKey => prevKey + 1);
      } else {
        console.log('Filters unchanged, skipping update');
      }
      console.groupEnd();
    }
  };

  return (
    <div className="map-page">
      <div className="sidebar">
        <FilterControls 
          onFilterChange={handleFilterChange} 
          initialFilters={filters}
        />
      </div>
      <div className="map-container">
        {/* Use key to force re-render when filters change */}
        <MapComponent 
          key={mapKey} 
          filters={filters} 
        />
      </div>
    </div>
  );
};

export default MapPage;

import React, { useState, useCallback, useEffect } from 'react';
import { FilterOptions } from '../types';
import '../styles/FilterControls.css';

interface FilterControlsProps {
  onFilterChange: (filters: FilterOptions) => void;
  initialFilters?: FilterOptions;
}

const FilterControls: React.FC<FilterControlsProps> = ({ 
  onFilterChange, 
  initialFilters 
}) => {
  // Initialize state with initial filters or defaults
  const [radius, setRadius] = useState<number>(initialFilters?.radius || 2); // Reduced default radius from 10km to 2km
  const [isUnisex, setIsUnisex] = useState<boolean | undefined>(initialFilters?.is_unisex);
  const [isAccessible, setIsAccessible] = useState<boolean | undefined>(initialFilters?.is_accessible);
  const [hasChangingTable, setHasChangingTable] = useState<boolean | undefined>(initialFilters?.has_changing_table);

  // Handle radius change
  const handleRadiusChange = useCallback((newRadius: number) => {
    console.group('🎛️ [FILTER-CONTROLS] Radius Change');
    console.log('Previous radius:', radius);
    console.log('New radius:', newRadius);
    
    setRadius(newRadius);
    
    // Create filters object
    const filters: FilterOptions = {
      radius: newRadius,
      is_unisex: isUnisex,
      is_accessible: isAccessible,
      has_changing_table: hasChangingTable
    };
    
    console.log('Filter object being sent:', filters);
    
    // Call onFilterChange with the updated filters
    onFilterChange(filters);
    console.groupEnd();
  }, [radius, isUnisex, isAccessible, hasChangingTable, onFilterChange]);
  
  // Handle feature filter changes
  const handleFeatureChange = useCallback((
    feature: 'is_unisex' | 'is_accessible' | 'has_changing_table',
    value: boolean | undefined
  ) => {
    console.group(`🎛️ [FILTER-CONTROLS] Feature Change: ${feature}`);
    console.log('Previous value:', feature === 'is_unisex' ? isUnisex : 
                                 feature === 'is_accessible' ? isAccessible : 
                                 hasChangingTable);
    console.log('New value:', value);
    
    // Update the appropriate state
    if (feature === 'is_unisex') {
      console.log('Updating isUnisex state');
      setIsUnisex(value);
    } else if (feature === 'is_accessible') {
      console.log('Updating isAccessible state');
      setIsAccessible(value);
    } else if (feature === 'has_changing_table') {
      console.log('Updating hasChangingTable state');
      setHasChangingTable(value);
    }
    
    // Create filters object with the updated feature
    const filters: FilterOptions = {
      radius,
      is_unisex: feature === 'is_unisex' ? value : isUnisex,
      is_accessible: feature === 'is_accessible' ? value : isAccessible,
      has_changing_table: feature === 'has_changing_table' ? value : hasChangingTable
    };
    
    console.log('Filter object being sent:', filters);
    
    // Call onFilterChange with the updated filters
    onFilterChange(filters);
    console.groupEnd();
  }, [radius, isUnisex, isAccessible, hasChangingTable, onFilterChange]);

  // Helper function to handle checkbox state (three states: true, false, undefined)
  const handleCheckboxChange = (
    feature: 'is_unisex' | 'is_accessible' | 'has_changing_table',
    value: boolean | undefined
  ) => {
    console.group(`🎛️ [FILTER-CONTROLS] Checkbox Toggle: ${feature}`);
    console.log('Current value:', value);
    
    let newValue: boolean | undefined;
    
    if (value === undefined) {
      newValue = true;
      console.log('Toggling from undefined (Any) → true (Yes)');
    } else if (value === true) {
      newValue = false;
      console.log('Toggling from true (Yes) → false (No)');
    } else {
      newValue = undefined;
      console.log('Toggling from false (No) → undefined (Any)');
    }
    
    console.log('New value after toggle:', newValue);
    
    // Update the filter with the new value
    handleFeatureChange(feature, newValue);
    console.groupEnd();
  };

  // Get checkbox label based on three-state value
  const getCheckboxLabel = (value: boolean | undefined): string => {
    if (value === undefined) return 'Any';
    return value ? 'Yes' : 'No';
  };

  return (
    <div className="filter-controls">
      <h3>Bathroom Filters</h3>
      
      
      <div className="filter-section">
        <label htmlFor="radius-slider">Distance: {radius} km</label>
        <input
          id="radius-slider"
          type="range"
          min="1"
          max="50"
          step="1"
          value={radius}
          onChange={(e) => {
            const newRadius = parseInt(e.target.value);
            handleRadiusChange(newRadius);
          }}
          className="slider"
        />
      </div>
      
      <div className="filter-section">
        <label>Bathroom Features</label>
        <div className="checkbox-group">
          <button 
            className={`feature-button ${isUnisex !== undefined ? (isUnisex ? 'positive' : 'negative') : ''}`}
            onClick={() => handleCheckboxChange('is_unisex', isUnisex)}
          >
            Unisex: {getCheckboxLabel(isUnisex)}
          </button>
          
          <button 
            className={`feature-button ${isAccessible !== undefined ? (isAccessible ? 'positive' : 'negative') : ''}`}
            onClick={() => handleCheckboxChange('is_accessible', isAccessible)}
          >
            Accessible: {getCheckboxLabel(isAccessible)}
          </button>
          
          <button 
            className={`feature-button ${hasChangingTable !== undefined ? (hasChangingTable ? 'positive' : 'negative') : ''}`}
            onClick={() => handleCheckboxChange('has_changing_table', hasChangingTable)}
          >
            Changing Table: {getCheckboxLabel(hasChangingTable)}
          </button>
        </div>
      </div>
      
      {/* Add ripple animation */}
      <style>
        {`
          @keyframes ripple {
            0% {
              transform: scale(0);
              opacity: 1;
            }
            100% {
              transform: scale(4);
              opacity: 0;
            }
          }
          
          .feature-button {
            padding: 8px 12px;
            margin: 5px;
            border-radius: 4px;
            border: 1px solid #ccc;
            background-color: #f8f8f8;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .feature-button.positive {
            background-color: #d4edda;
            border-color: #c3e6cb;
            color: #155724;
          }
          
          .feature-button.negative {
            background-color: #f8d7da;
            border-color: #f5c6cb;
            color: #721c24;
          }
        `}
      </style>
    </div>
  );
};

export default FilterControls;

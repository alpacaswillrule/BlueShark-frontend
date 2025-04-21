import React, { useState } from 'react';
import { createReview, createBathroom } from '../services/api';
import '../styles/RatingForm.css';

interface RatingFormProps {
  bathroomId?: number;
  bathroomName?: string;
  onSubmitSuccess?: () => void;
}

const RatingForm: React.FC<RatingFormProps> = ({
  bathroomId,
  bathroomName,
  onSubmitSuccess
}) => {
  const [rating, setRating] = useState<number>(3); // Default to 3 stars (middle)
  const [comment, setComment] = useState('');
  const [directions, setDirections] = useState('');
  const [isNewBathroom, setIsNewBathroom] = useState(!bathroomId);
  const [newBathroomName, setNewBathroomName] = useState(bathroomName || '');
  const [newBathroomAddress, setNewBathroomAddress] = useState('');
  const [newBathroomLat, setNewBathroomLat] = useState<number | ''>('');
  const [newBathroomLng, setNewBathroomLng] = useState<number | ''>('');
  const [isUnisex, setIsUnisex] = useState<boolean>(false);
  const [isAccessible, setIsAccessible] = useState<boolean>(false);
  const [hasChangingTable, setHasChangingTable] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get current location for new bathrooms
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewBathroomLat(position.coords.latitude);
          setNewBathroomLng(position.coords.longitude);
        },
        () => {
          setError('Error getting your location. Please enter coordinates manually.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser. Please enter coordinates manually.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate form
      if (isNewBathroom) {
        if (!newBathroomName.trim()) {
          throw new Error('Please enter a bathroom name');
        }
        if (!newBathroomAddress.trim()) {
          throw new Error('Please enter a bathroom address');
        }
        if (newBathroomLat === '' || newBathroomLng === '') {
          throw new Error('Please provide bathroom coordinates');
        }
      }

      let reviewResult = false;

      if (isNewBathroom) {
        // Create a new bathroom first
        const bathroomData = {
          name: newBathroomName.trim(),
          address: newBathroomAddress.trim(),
          latitude: typeof newBathroomLat === 'number' ? newBathroomLat : parseFloat(String(newBathroomLat)),
          longitude: typeof newBathroomLng === 'number' ? newBathroomLng : parseFloat(String(newBathroomLng)),
          is_unisex: isUnisex,
          is_accessible: isAccessible,
          has_changing_table: hasChangingTable,
          directions: directions.trim() || undefined,
          external_source: 'user-submitted'
        };

        const newBathroom = await createBathroom(bathroomData);

        if (newBathroom) {
          // Then create a review for the new bathroom
          const reviewData = {
            bathroom_id: newBathroom.id,
            rating: rating,
            comment: comment.trim() || undefined,
            directions: directions.trim() || undefined
          };

          const review = await createReview(reviewData);
          reviewResult = !!review;
        } else {
          throw new Error('Failed to create bathroom. Please try again.');
        }
      } else if (bathroomId) {
        // Just create a review for an existing bathroom
        const reviewData = {
          bathroom_id: bathroomId,
          rating: rating,
          comment: comment.trim() || undefined,
          directions: directions.trim() || undefined
        };

        const review = await createReview(reviewData);
        reviewResult = !!review;
      } else {
        throw new Error('Invalid bathroom ID. Please try again.');
      }

      if (reviewResult) {
        setSuccess(true);
        // Reset form
        setRating(3);
        setComment('');
        setDirections('');
        if (isNewBathroom) {
          setNewBathroomName('');
          setNewBathroomAddress('');
          setNewBathroomLat('');
          setNewBathroomLng('');
          setIsUnisex(false);
          setIsAccessible(false);
          setHasChangingTable(false);
        }
        // Notify parent component
        if (onSubmitSuccess) {
          onSubmitSuccess();
        }
      } else {
        throw new Error('Failed to submit review. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render star rating component
  const renderStarRating = () => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : 'empty'}`}
            onClick={() => setRating(star)}
          >
            ★
          </span>
        ))}
        <span className="rating-text">{rating} out of 5 stars</span>
      </div>
    );
  };

  return (
    <div className="rating-form-container">
      <h2>Submit a Review</h2>
      
      {success ? (
        <div className="success-message">
          <p>Thank you for your feedback!</p>
          <button 
            className="submit-button"
            onClick={() => setSuccess(false)}
          >
            Submit Another Review
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rating-form">
          {isNewBathroom ? (
            <div className="form-section">
              <h3>New Bathroom Details</h3>
              
              <div className="form-group">
                <label htmlFor="bathroom-name">Bathroom Name *</label>
                <input
                  id="bathroom-name"
                  type="text"
                  value={newBathroomName}
                  onChange={(e) => setNewBathroomName(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="bathroom-address">Address *</label>
                <input
                  id="bathroom-address"
                  type="text"
                  value={newBathroomAddress}
                  onChange={(e) => setNewBathroomAddress(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group coordinates">
                <div>
                  <label htmlFor="bathroom-lat">Latitude *</label>
                  <input
                    id="bathroom-lat"
                    type="number"
                    step="any"
                    value={newBathroomLat}
                    onChange={(e) => setNewBathroomLat(e.target.value ? parseFloat(e.target.value) : '')}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="bathroom-lng">Longitude *</label>
                  <input
                    id="bathroom-lng"
                    type="number"
                    step="any"
                    value={newBathroomLng}
                    onChange={(e) => setNewBathroomLng(e.target.value ? parseFloat(e.target.value) : '')}
                    required
                  />
                </div>
                
                <button 
                  type="button" 
                  className="location-button"
                  onClick={getCurrentLocation}
                >
                  Use My Location
                </button>
              </div>
              
              <div className="form-group">
                <label>Bathroom Features</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isUnisex}
                      onChange={(e) => setIsUnisex(e.target.checked)}
                    />
                    Unisex / Gender Neutral
                  </label>
                  
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isAccessible}
                      onChange={(e) => setIsAccessible(e.target.checked)}
                    />
                    ADA Accessible
                  </label>
                  
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={hasChangingTable}
                      onChange={(e) => setHasChangingTable(e.target.checked)}
                    />
                    Has Changing Table
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="form-section">
              <h3>Review for: {bathroomName}</h3>
            </div>
          )}
          
          <div className="form-section">
            <h3>Your Review</h3>
            
            <div className="form-group">
              <label>Rating *</label>
              {renderStarRating()}
            </div>
            
            <div className="form-group">
              <label htmlFor="directions">Directions (Optional)</label>
              <textarea
                id="directions"
                value={directions}
                onChange={(e) => setDirections(e.target.value)}
                rows={2}
                placeholder="How to find this bathroom..."
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="comment">Comment (Optional)</label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Share your experience..."
              />
            </div>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            type="submit" 
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      )}
      
      {/* Add CSS for star rating */}
      <style>
        {`
          .star-rating {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
          }
          
          .star {
            font-size: 24px;
            cursor: pointer;
            margin-right: 5px;
          }
          
          .star.filled {
            color: gold;
          }
          
          .star.empty {
            color: #ccc;
          }
          
          .rating-text {
            margin-left: 10px;
            font-size: 14px;
          }
        `}
      </style>
    </div>
  );
};

export default RatingForm;

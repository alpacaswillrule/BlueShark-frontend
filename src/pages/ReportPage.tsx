import React from 'react';
import RatingForm from '../components/RatingForm';
import '../styles/ReportPage.css';

const ReportPage: React.FC = () => {
  return (
    <div className="report-page">
      <div className="report-container">
        <div className="page-header">
          <h1>Submit a Bathroom Review</h1>
          <p>
            Help make our community safer by sharing your experiences with public bathrooms.
            Your feedback helps others find safe, accessible, and gender-inclusive facilities.
          </p>
        </div>
        <RatingForm />
      </div>
    </div>
  );
};

export default ReportPage;

import React from 'react';
import SectionRule from './SectionRule';

const FormCard = ({ 
  title, 
  subtitle, 
  children, 
  quote, 
  author, 
  containerClass = "",
  headerIcon = "✎"
}) => {
  return (
    <div className={`form-card-container ${containerClass}`}>
      <div className="card-header">
        <span>{headerIcon} {title}</span>
        <span>{subtitle}</span>
      </div>

      <div className="card-body">
        {children}
      </div>

      {quote && (
        <div className="quote-section">
          <SectionRule className="quote-rule" />
          <span className="quote-text">"{quote}"</span>
          <span className="quote-author">— {author}</span>
        </div>
      )}
    </div>
  );
};

export default FormCard;

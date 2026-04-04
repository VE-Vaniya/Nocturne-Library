import React from 'react';

const SectionRule = ({ className = "" }) => (
  <div className={`section-rule ${className}`}>
    <span className="line"></span>
    <span className="diamond"></span>
    <span className="line"></span>
  </div>
);

export default SectionRule;

import React from 'react';

const ProgressBar = ({ label, current, total, colorClass, widthPercent }) => (
  <div className="goal-row">
    <div className="goal-labels">
      <span className="goal-name">{label}</span>
      <span className="goal-vals"><strong>{current}</strong>/{total}</span>
    </div>
    <div className="goal-track">
      <div className={`goal-fill ${colorClass}`} style={{ width: widthPercent }}></div>
    </div>
  </div>
);

export default ProgressBar;

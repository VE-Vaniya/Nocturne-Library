import React from 'react';

const StatCard = ({ icon, value, label, sub, colorClass }) => (
  <div className="stat-card">
    <div className="stat-icon">{icon}</div>
    <div className={`stat-num ${colorClass}`}>{value}</div>
    <div className="stat-label">{label}</div>
    <div className="stat-sub">{sub}</div>
  </div>
);

export default StatCard;

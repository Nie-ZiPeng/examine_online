import React from 'react';
import './index.css';

const PageCard = ({ children, className = '', style }) => (
  <div className={`page-card ${className}`} style={style}>
    {children}
  </div>
);

export default PageCard;

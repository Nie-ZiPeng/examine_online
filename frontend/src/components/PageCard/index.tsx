import React from 'react';
import './index.css';

interface PageCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const PageCard = ({ children, className = '', style }: PageCardProps) => (
  <div className={`page-card ${className}`} style={style}>
    {children}
  </div>
);

export default PageCard;

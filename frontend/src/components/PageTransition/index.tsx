import React from 'react';
import './index.css';

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => (
  <div className="page-transition">{children}</div>
);

export default PageTransition;

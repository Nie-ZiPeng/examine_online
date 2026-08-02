import React from 'react';
import './index.css';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  extra?: React.ReactNode;
}

const PageHeader = ({ title, subtitle, extra }: PageHeaderProps) => (
  <div className="page-header">
    <div className="page-header-text">
      <h2 className="page-header-title">{title}</h2>
      {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
    </div>
    {extra && <div className="page-header-extra">{extra}</div>}
  </div>
);

export default PageHeader;

import React from 'react';
import { Card, Skeleton } from 'antd';
import './index.css';

interface SkeletonGridProps {
  count?: number;
  columns?: number;
}

const SkeletonGrid = ({ count = 6, columns = 3 }: SkeletonGridProps) => (
  <div className="skeleton-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="skeleton-grid-item">
        <Skeleton active paragraph={{ rows: 2 }} />
      </Card>
    ))}
  </div>
);

export default SkeletonGrid;

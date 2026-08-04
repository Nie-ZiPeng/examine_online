import React from 'react';
import './index.css';

export type StatusType =
  | 'not_started'
  | 'ongoing'
  | 'finished'
  | 'pending_grading'
  | 'passed'
  | 'failed';

const STATUS_MAP: Record<StatusType, { label: string; className: string; dot: string }> = {
  not_started: { label: '未开始', className: 'status-tag-blue', dot: '#3D5A80' },
  ongoing: { label: '进行中', className: 'status-tag-green', dot: '#52C41A' },
  finished: { label: '已结束', className: 'status-tag-gray', dot: '#B0B8C2' },
  pending_grading: { label: '待批改', className: 'status-tag-orange', dot: '#FA8C16' },
  passed: { label: '已通过', className: 'status-tag-green', dot: '#52C41A' },
  failed: { label: '未通过', className: 'status-tag-red', dot: '#FF4D4F' },
};

interface StatusTagProps {
  status: StatusType;
  label?: string;
}

const StatusTag = ({ status, label }: StatusTagProps) => {
  const meta = STATUS_MAP[status];
  return (
    <span className={`status-tag ${meta.className}`}>
      <span className="status-tag-dot" style={{ background: meta.dot }} />
      {label || meta.label}
    </span>
  );
};

export default StatusTag;

import type { ReactNode } from 'react';

import './FeedbackPanel.css';

interface FeedbackPanelProps {
  title: string;
  message: string;
  role?: 'status' | 'alert';
  children?: ReactNode;
}

export function FeedbackPanel({ title, message, role = 'status', children }: FeedbackPanelProps) {
  return (
    <div className="feedback-panel" role={role}>
      <h3>{title}</h3>
      <p>{message}</p>
      {children}
    </div>
  );
}

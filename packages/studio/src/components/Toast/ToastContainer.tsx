import React from 'react';
import { useToast } from '../../context/ToastContext';
import { ToastItem } from './Toast';
import './Toast.css';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
};

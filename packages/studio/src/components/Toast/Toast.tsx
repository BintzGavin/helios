import React from 'react';
import { Toast as ToastType } from '../../context/ToastContext';
import './Toast.css';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: number) => void;
}

export const ToastItem: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  return (
    <div className={`toast-item toast-${toast.type}`}>
      <div className="toast-content">{toast.message}</div>
      <button
        className="toast-close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

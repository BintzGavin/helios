import React from 'react';
import { createPortal } from 'react-dom';
import './ConfirmationModal.css';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false
}) => {
  // Close on Escape
  useKeyboardShortcut('Escape', () => {
    if (isOpen) onClose();
  });

  if (!isOpen) return null;

  return createPortal(
    <div className="confirmation-modal-overlay" onClick={onClose}>
      <div className="confirmation-modal-content" onClick={e => e.stopPropagation()}>
        <h3 className="confirmation-modal-title">{title}</h3>
        <div className="confirmation-modal-message">{message}</div>
        <div className="confirmation-modal-actions">
          <button
            className="confirmation-modal-button cancel"
            onClick={onClose}
            autoFocus={isDestructive}
          >
            {cancelLabel}
          </button>
          <button
            className={`confirmation-modal-button confirm ${isDestructive ? 'destructive' : ''}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            autoFocus={!isDestructive}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

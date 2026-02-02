import { render, screen, fireEvent } from '@testing-library/react';
import { ToastItem } from './Toast';
import { Toast } from '../../context/ToastContext';
import { describe, it, expect, vi } from 'vitest';

describe('ToastItem', () => {
  const mockToast: Toast = {
    id: 123,
    message: 'Test Message',
    type: 'success',
  };

  const mockOnDismiss = vi.fn();

  it('renders the toast message correctly', () => {
    render(<ToastItem toast={mockToast} onDismiss={mockOnDismiss} />);
    expect(screen.getByText('Test Message')).toBeInTheDocument();
  });

  it('applies the correct type class', () => {
    const { container } = render(<ToastItem toast={mockToast} onDismiss={mockOnDismiss} />);
    expect(container.firstChild).toHaveClass('toast-item');
    expect(container.firstChild).toHaveClass('toast-success');
  });

  it('calls onDismiss when close button is clicked', () => {
    render(<ToastItem toast={mockToast} onDismiss={mockOnDismiss} />);
    const closeButton = screen.getByLabelText('Close notification');
    fireEvent.click(closeButton);
    expect(mockOnDismiss).toHaveBeenCalledWith(123);
  });
});

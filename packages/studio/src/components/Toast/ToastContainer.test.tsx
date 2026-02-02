import { render, screen } from '@testing-library/react';
import { ToastContainer } from './ToastContainer';
import { vi, describe, it, expect } from 'vitest';

const mockRemoveToast = vi.fn();
const mockToasts = [
  { id: 1, message: 'Toast 1', type: 'info' },
  { id: 2, message: 'Toast 2', type: 'error' },
];

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({
    toasts: mockToasts,
    removeToast: mockRemoveToast,
  }),
}));

describe('ToastContainer', () => {
  it('renders a list of toasts', () => {
    render(<ToastContainer />);
    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
  });
});

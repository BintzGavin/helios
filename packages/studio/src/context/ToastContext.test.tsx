import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const TestComponent = () => {
  const { addToast, removeToast, toasts } = useToast();
  return (
    <div>
      <button onClick={() => addToast('Test Toast', 'info')}>Add Toast</button>
      <button onClick={() => addToast('Auto Dismiss Toast', 'success', 100)}>Add Auto Dismiss</button>
      <ul>
        {toasts.map((toast) => (
          <li key={toast.id} data-testid="toast-item">
            {toast.message}
            <button onClick={() => removeToast(toast.id)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('provides toast functionality', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const addButton = screen.getByText('Add Toast');
    fireEvent.click(addButton);

    expect(screen.getByText('Test Toast')).toBeInTheDocument();
  });

  it('removes a toast manually', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Add Toast'));
    expect(screen.getByText('Test Toast')).toBeInTheDocument();

    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);

    expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
  });

  it('automatically dismisses toast after duration', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Add Auto Dismiss'));
    expect(screen.getByText('Auto Dismiss Toast')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.queryByText('Auto Dismiss Toast')).not.toBeInTheDocument();
  });
});

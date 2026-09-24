import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePersistentState } from './usePersistentState';

describe('usePersistentState', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with initial value if localStorage is empty', () => {
    const { result } = renderHook(() => usePersistentState('test-key', 'initial'));
    expect(result.current[0]).toBe('initial');
  });

  it('should initialize with value from localStorage if it exists', () => {
    localStorage.setItem('helios-studio:test-key', JSON.stringify('stored-value'));
    const { result } = renderHook(() => usePersistentState('test-key', 'initial'));
    expect(result.current[0]).toBe('stored-value');
  });

  it('should update state and localStorage when setState is called', () => {
    const { result } = renderHook(() => usePersistentState('test-key', 'initial'));
    act(() => {
      result.current[1]('new-value');
    });
    expect(result.current[0]).toBe('new-value');
    expect(localStorage.getItem('helios-studio:test-key')).toBe(JSON.stringify('new-value'));
  });

  it('should catch error on mount if getItem throws and fallback to initial value', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('test mount error'); });

    const { result } = renderHook(() => usePersistentState('test-error', 'fallback'));
    expect(result.current[0]).toBe('fallback');
    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to load state for test-error', expect.any(Error));
  });

  it('should catch error when updating state if setItem throws', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('test update error'); });

    const { result } = renderHook(() => usePersistentState('test-error-update', 'initial'));
    act(() => {
      result.current[1]('new-value');
    });
    expect(result.current[0]).toBe('new-value');
    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to save state for test-error-update', expect.any(Error));
  });
});

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useKeyboardShortcut } from './useKeyboardShortcut';

describe('useKeyboardShortcut', () => {
  let callback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    callback = vi.fn();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call the callback when the correct key is pressed', () => {
    renderHook(() => useKeyboardShortcut('a', callback));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not call the callback for a different key', () => {
    renderHook(() => useKeyboardShortcut('a', callback));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
    expect(callback).not.toHaveBeenCalled();
  });

  it('should handle uppercase key presses if the key matches case insensitively', () => {
    renderHook(() => useKeyboardShortcut('a', callback));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should call preventDefault when preventDefault option is true', () => {
    renderHook(() => useKeyboardShortcut('a', callback, { preventDefault: true }));
    const event = new KeyboardEvent('keydown', { key: 'a', cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should require ctrl or cmd when ctrlOrCmd option is true', () => {
    renderHook(() => useKeyboardShortcut('a', callback, { ctrlOrCmd: true }));

    // No modifier
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(callback).not.toHaveBeenCalled();

    // With ctrlKey
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }));
    expect(callback).toHaveBeenCalledTimes(1);

    // With metaKey
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', metaKey: true }));
    expect(callback).toHaveBeenCalledTimes(2);
  });

  describe('ignoreInput option', () => {
    let mockElement: HTMLElement;

    beforeEach(() => {
      mockElement = document.createElement('div');
      document.body.appendChild(mockElement);
      // We will mock activeElement
    });

    afterEach(() => {
      document.body.removeChild(mockElement);
      vi.restoreAllMocks();
    });

    it('should ignore input when focused in an input element', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      renderHook(() => useKeyboardShortcut('a', callback, { ignoreInput: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(callback).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it('should ignore input when focused in a textarea element', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();

      renderHook(() => useKeyboardShortcut('a', callback, { ignoreInput: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(callback).not.toHaveBeenCalled();

      document.body.removeChild(textarea);
    });

    it('should ignore input when focused in a select element', () => {
      const select = document.createElement('select');
      document.body.appendChild(select);
      select.focus();

      renderHook(() => useKeyboardShortcut('a', callback, { ignoreInput: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(callback).not.toHaveBeenCalled();

      document.body.removeChild(select);
    });

    it('should ignore input when focused in a contentEditable element', () => {
      const div = document.createElement('div');
      div.isContentEditable = true;
      document.body.appendChild(div);
      // Focus does not always set activeElement properly in JSDOM,
      // so mock the property directly on document
      const activeElementSpy = vi.spyOn(document, 'activeElement', 'get').mockReturnValue(div);

      renderHook(() => useKeyboardShortcut('a', callback, { ignoreInput: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(callback).not.toHaveBeenCalled();

      document.body.removeChild(div);
      activeElementSpy.mockRestore();
    });

    it('should NOT ignore input when focused on a normal div', () => {
      mockElement.focus();

      renderHook(() => useKeyboardShortcut('a', callback, { ignoreInput: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should NOT ignore input when focused in an element where isContentEditable is false', () => {
      const div = document.createElement('div');
      div.isContentEditable = false;
      document.body.appendChild(div);
      const activeElementSpy = vi.spyOn(document, 'activeElement', 'get').mockReturnValue(div);

      renderHook(() => useKeyboardShortcut('a', callback, { ignoreInput: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(callback).toHaveBeenCalledTimes(1);

      document.body.removeChild(div);
      activeElementSpy.mockRestore();
    });

    it('should ignore input when focused in an element where isContentEditable is undefined (e.g. SVG)', () => {
      const activeElementSpy = vi.spyOn(document, 'activeElement', 'get').mockReturnValue({ tagName: 'SVG' } as any);

      renderHook(() => useKeyboardShortcut('a', callback, { ignoreInput: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(callback).toHaveBeenCalledTimes(1);

      activeElementSpy.mockRestore();
    });

    it('should not throw if activeElement is null', () => {
      const activeElementSpy = vi.spyOn(document, 'activeElement', 'get').mockReturnValue(null);

      renderHook(() => useKeyboardShortcut('a', callback, { ignoreInput: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(callback).toHaveBeenCalledTimes(1);

      activeElementSpy.mockRestore();
    });
  });

  it('should update callback reference if callback changes', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const { rerender } = renderHook(({ cb }) => useKeyboardShortcut('a', cb), { initialProps: { cb: callback1 } });

    // Call with callback1
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).not.toHaveBeenCalled();

    // Rerender with callback2
    rerender({ cb: callback2 });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);
  });
});

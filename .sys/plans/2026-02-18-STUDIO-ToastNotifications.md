# 📋 STUDIO: Implement Toast Notifications

## 1. Context & Goal
- **Objective**: Implement a centralized Toast Notification system to provide visual feedback for actions (success/error) and surface hidden console errors to the user/agent.
- **Trigger**: Vision Gap - "Clear error messages - Machine-readable, actionable errors". Current reality relies on silent console errors and intrusive `alert()`.
- **Impact**: Significantly improves Agent Experience (AX) and User Experience (UX) by making system state and errors visible and actionable.

## 2. File Inventory
- **Create**:
  - `packages/studio/src/context/ToastContext.tsx` (Context provider and hook)
  - `packages/studio/src/components/Toast/ToastContainer.tsx` (Container for rendering toasts)
  - `packages/studio/src/components/Toast/Toast.tsx` (Individual toast component)
  - `packages/studio/src/components/Toast/Toast.css` (Styles for animations and themes)
- **Modify**:
  - `packages/studio/src/App.tsx` (Wrap application with `ToastProvider`)
  - `packages/studio/src/context/StudioContext.tsx` (Consume `useToast` to report async errors/successes)
  - `packages/studio/src/components/AssetsPanel/AssetItem.tsx` (Replace `alert()` with `toast.error()`)
  - `packages/studio/src/components/Omnibar.tsx` (Add `toast.success()` for copy actions)
  - `packages/studio/src/components/Stage/Stage.tsx` (Add `toast.success()` for snapshots)
- **Read-Only**:
  - `packages/studio/src/vite-env.d.ts` (Type definitions)

## 3. Implementation Spec
- **Architecture**:
  - **Context Pattern**: `ToastProvider` manages the state (array of toast objects) and exposes an `addToast` method via `useToast` hook.
  - **Component Structure**: `ToastContainer` is rendered by the Provider at the root level, ensuring it overlays all other UI elements (z-index).
  - **Auto-Dismiss**: Toasts automatically remove themselves after a set duration (e.g., 3000ms), managed by `setTimeout`.
  - **Types**: Support `info` (blue), `success` (green), `warning` (orange), `error` (red).

- **Pseudo-Code**:
  ```tsx
  // ToastContext.tsx
  interface Toast { id, message, type, duration }

  export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = (msg, type = 'info', duration = 3000) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, msg, type }]);
      setTimeout(() => removeToast(id), duration);
    };

    const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    return (
      <ToastContext.Provider value={{ addToast, removeToast }}>
        {children}
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </ToastContext.Provider>
    );
  }
  ```

- **Public API Changes**:
  - **New Hook**: `useToast()` returns `{ addToast(message, type?, duration?) }`.
  - **StudioContext**: Will implicitly change behavior to notify users via Toast instead of logging to console.

- **Dependencies**:
  - `ToastProvider` must be higher in the component tree than `StudioProvider` so `StudioContext` can use the hook.

## 4. Test Plan
- **Verification**:
  1. Start the studio: `npm run dev` (or `npx helios studio`).
  2. **Test Success**: Click "Take Snapshot". Verify a green toast appears: "Snapshot saved".
  3. **Test Info**: Copy an asset path from Omnibar. Verify a blue/info toast: "Path copied to clipboard".
  4. **Test Error**: Disconnect network or mock a failure in `uploadAsset`. Verify a red toast: "Upload failed: [error message]".
- **Success Criteria**:
  - Toasts appear in the bottom-right corner.
  - Toasts animate in/out (fade/slide).
  - Toasts auto-dismiss.
  - Multiple toasts stack correctly.
- **Edge Cases**:
  - Rapidly triggering multiple toasts (should stack, not overlap).
  - Extremely long error messages (should wrap or truncate with ellipsis).

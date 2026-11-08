Reflecting on the task:
## 0.124.3 - PropsEditor Coverage Gap
**Learning:** Testing component behaviour dependent on generic HTML nodes without ARIA labels or `id`s causes standard queries like `getByLabelText` to fail.
**Action:** Use CSS selector fallback like `document.querySelector('input[type="file"]')` or directly query `container.querySelector` in test files when standard React Testing Library queries fail for unlabelled hidden inputs.

## 0.124.3 - Improving React testing boundaries
**Learning:** Components that invoke side effects affecting context state immediately on mount or user interaction can leak asynchronous updates outside of the normal testing boundaries, triggering act() console warnings if not handled properly.
**Action:** Ensure asynchronous mounts like render() are wrapped with await act(async () => { ... }) and interactions like fireEvent updates are encapsulated correctly.

## 0.124.3 - Timeline Component Coverage
**Learning:** The Timeline component handles many complex UI events like mouse drag (via document-level listeners) and track hovering. Test suites must correctly mock `getBoundingClientRect` on containers to enable pixel-to-frame coordinate mapping before firing `mouseMove` events.
**Action:** Mock `content.getBoundingClientRect` accurately when testing track position and hover states, and remember to fire `mouseup` to reset document-level event listeners between drag tests.

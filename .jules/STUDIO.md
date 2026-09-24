## 0.122.2 - Ensure clean state for mock inputs
**Learning:** Testing component behaviour dependent on generic HTML nodes without ARIA labels or `id`s causes standard queries like `getByLabelText` to fail. File `<input>` inputs for instance are challenging to select if lacking `id` or direct labeling.
**Action:** Use CSS selector fallback like `document.querySelector('input[type="file"]')` or directly query `container.querySelector` in test files when standard React Testing Library queries fail for unlabelled hidden inputs.

\n## 0.122.9 - Improving act() React testing blocks\n**Learning:** Components that invoke side effects affecting context state immediately on mount or user interaction can leak asynchronous updates outside of the normal testing boundaries, triggering  console warnings if not handled properly.\n**Action:** Ensure asynchronous mounts like  are wrapped with  and interactions like  updates are encapsulated using  correctly.

## 0.122.9 - Improving React testing boundaries
**Learning:** Components that invoke side effects affecting context state immediately on mount or user interaction can leak asynchronous updates outside of the normal testing boundaries, triggering act() console warnings if not handled properly.
**Action:** Ensure asynchronous mounts like render() are wrapped with await act(async () => { ... }) and interactions like fireEvent updates are encapsulated correctly.

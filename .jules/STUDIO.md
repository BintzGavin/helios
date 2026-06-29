## 0.122.2 - Ensure clean state for mock inputs
**Learning:** Testing component behaviour dependent on generic HTML nodes without ARIA labels or `id`s causes standard queries like `getByLabelText` to fail. File `<input>` inputs for instance are challenging to select if lacking `id` or direct labeling.
**Action:** Use CSS selector fallback like `document.querySelector('input[type="file"]')` or directly query `container.querySelector` in test files when standard React Testing Library queries fail for unlabelled hidden inputs.


# Context & Goal
- **Objective**: Implement visual validation feedback in the Studio Props Editor to enforce schema constraints (pattern, min/max) and guide users.
- **Trigger**: The V1 Vision promises "Live editing of composition input props with schema validation," but the current implementation only passes constraints to the DOM without providing visual error feedback or enforcing validity in the UI.
- **Impact**: Improves User Experience by providing immediate feedback on invalid inputs and reduces the likelihood of sending malformed data to the controller.

# File Inventory
- **Create**:
  - `packages/studio/src/components/SchemaInputs.test.tsx`: Unit tests for validation logic and component rendering states.
- **Modify**:
  - `packages/studio/src/components/SchemaInputs.tsx`: Implement `validateValue` logic and update input components (`StringInput`, `NumberRangeInput`) to reflect error states.
  - `packages/studio/src/components/PropsEditor.css`: Add styles for validation errors (`.prop-input.error`) and tooltips.
- **Read-Only**:
  - `packages/studio/src/components/PropsEditor.tsx`: Context for usage.

# Implementation Spec
- **Architecture**:
  - Introduce a pure function `validateValue(value: any, definition: PropDefinition): { valid: boolean; message?: string }` in `SchemaInputs.tsx`.
  - Update `SchemaInput` sub-components (`StringInput`, `NumberRangeInput`) to use this validator on render.
  - If invalid, apply `.error` CSS class to the input element and set the `title` attribute to the error message.
  - This approach maintains "Live Editing" (updates are still sent to the controller) but warns the user, striking a balance between responsiveness and strictness.

- **Pseudo-Code**:
  ```typescript
  // packages/studio/src/components/SchemaInputs.tsx

  const validateValue = (value: any, def: PropDefinition) => {
    if (def.type === 'string') {
      if (def.minLength && value.length < def.minLength) return { valid: false, message: 'Too short' };
      if (def.maxLength && value.length > def.maxLength) return { valid: false, message: 'Too long' };
      if (def.pattern && !new RegExp(def.pattern).test(value)) return { valid: false, message: 'Pattern mismatch' };
    }
    if (def.type === 'number') {
      if (def.minimum !== undefined && value < def.minimum) return { valid: false, message: 'Value too low' };
      if (def.maximum !== undefined && value > def.maximum) return { valid: false, message: 'Value too high' };
    }
    return { valid: true };
  };

  const StringInput = ({ value, definition, ... }) => {
    const { valid, message } = validateValue(value, definition);
    return <input className={!valid ? 'error' : ''} title={message} ... />;
  };
  ```

- **Public API Changes**: None. Internal component updates only.
- **Dependencies**: None.

# Test Plan
- **Verification**:
  1. Run `npx helios studio`.
  2. Create a composition with props using `pattern` (e.g., regex for email) and `number` (min/max).
  3. Enter invalid values in the Props Editor.
  4. Verify the input border turns red and hovering shows the error message.
- **Success Criteria**:
  - Invalid inputs visualy indicate error state.
  - Valid inputs appear normal.
- **Edge Cases**:
  - Empty strings on required fields (if applicable).
  - Floating point precision issues for number ranges.
  - Complex Regex patterns.

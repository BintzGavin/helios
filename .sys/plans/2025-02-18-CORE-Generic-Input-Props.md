# Plan: Generic Input Props for Helios

## 1. Context & Goal
- **Objective**: Refactor the `Helios` class to accept a generic type argument `TInputProps` for strict property typing.
- **Trigger**: Vision alignment ("Pure TypeScript", "Agent Experience"). Currently, `inputProps` is untyped (`Record<string, any>`), leading to weak type safety for consumers.
- **Impact**: Improves Developer Experience (DX) and Agent Experience (AX) by enabling compile-time checks and autocomplete for composition properties.

## 2. File Inventory
- **Modify**: `packages/core/src/Helios.ts` (Add generics to class and interfaces)
- **Modify**: `packages/core/src/index.test.ts` (Add verification test case)

## 3. Implementation Spec
- **Architecture**:
  - `HeliosState<T>`: Add generic parameter `T` defaulting to `Record<string, any>`.
  - `HeliosOptions<T>`: Add generic parameter `T` for `inputProps`.
  - `HeliosSubscriber<T>`: Update to accept `HeliosState<T>`.
  - `Helios<T>`: Class generic.
- **Pseudo-Code**:
  ```typescript
  export type HeliosState<TInputProps = Record<string, any>> = {
    // ...
    inputProps: TInputProps;
    // ...
  };

  export interface HeliosOptions<TInputProps = Record<string, any>> {
    // ...
    inputProps?: TInputProps;
    // ...
  }

  export class Helios<TInputProps extends Record<string, any> = Record<string, any>> {
    private _inputProps: Signal<TInputProps>;

    constructor(options: HeliosOptions<TInputProps>) {
      // ...
      this._inputProps = signal(validateProps(...) as TInputProps);
    }

    public get inputProps(): ReadonlySignal<TInputProps> { ... }

    public setInputProps(props: TInputProps) { ... }
  }
  ```
- **Public API Changes**: `Helios`, `HeliosState`, `HeliosOptions` are now generic. Backward compatible due to default generic values.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - All existing tests pass (backward compatibility).
  - New test case passes verifying instantiation with specific interface.
- **Edge Cases**:
  - Instantiation without generic (should default to `any` or `Record<string, any>`).
  - Instantiation with partial props (should be caught by type checker, but allowed at runtime if schema allows optional).

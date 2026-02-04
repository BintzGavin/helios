## 0.66.3 - Sandbox Attribute Getter
**Learning:** The `sandbox` getter in `HeliosPlayer` incorrectly returns the default value when the attribute is set to an empty string (`""`), preventing users from enabling strict sandbox mode via the property. The attribute behavior itself is correct.
**Action:** In future refactors, update the `sandbox` getter to check for `null` explicitly rather than using the `||` operator on the attribute value.

## 0.66.3 - Audio Track UI
**Learning:** While the `AudioTracks` API was implemented, the lack of UI controls made it inaccessible for previewing multi-track compositions without custom code.
**Action:** When implementing new APIs that affect user-perceivable state (like tracks), always include a corresponding UI control update in the plan.

## [0.23.2] - Code Review False Positives
**Learning:** Code review flagged a "missing import" and "undefined variable" that were actually present in the file but not in the diff.
**Action:** Always verify the full file content when a review claims something is missing, rather than blindly accepting the review.

## [0.27.0] - Bypassing Core Gaps with inputProps
**Learning:** When Core lacks a dedicated API (e.g., `setCaptions`), Studio can often bridge the gap by injecting data directly into `inputProps`, allowing user code to consume it without waiting for Core updates.
**Action:** Look for `inputProps` injection opportunities when faced with Core API limitations for data-driven features.

cat << 'INNER_EOF' > /tmp/docs_update.patch
--- docs/status/RENDERER-EXPERIMENTS.md
+++ docs/status/RENDERER-EXPERIMENTS.md
@@ -1,7 +1,13 @@
 ## Performance Trajectory
-Current best: 17.163s (baseline was 17.687s)
-Last updated by: PERF-519
+Current best: 17.071s (baseline was 17.163s)
+Last updated by: PERF-520

 ## What Works
+- **PERF-520**: Inline defaultStabilityCheck Promise
+  - **What I tried**: Replaced the `.then` promise chaining in the `defaultStabilityCheck` method with an `await` + `try...catch` approach directly in `runSetTime`.
+  - **Outcome**: Kept. Improved render time to median ~17.071s vs baseline ~17.163s. Avoiding the secondary Promise wrapper allocation on every frame slightly improved loop performance.
 - **PERF-519**: Inline DomStrategy Promise
   - **What I tried**: Replaced the `.then` promise chaining in the `capture` method with an `await` + `try...catch` approach.
INNER_EOF
patch docs/status/RENDERER-EXPERIMENTS.md < /tmp/docs_update.patch

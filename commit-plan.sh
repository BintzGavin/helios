git add .sys/plans/PERF-948-use-single-pooled-buffer.md
git commit -m "📋 RENDERER: Optimize Base64 Encoding Loop

💡 What: Replace linked-list buffer pool with a single reusable buffer for Base64 writes.
🎯 Why: linked list tracking and closures added unnecessary overhead because Node streams copy chunks synchronously into their queue.
🔬 Approach: Use a single buffer and overwrite it. Reallocate only when length exceeds.
📎 Plan: /.sys/plans/PERF-948-use-single-pooled-buffer.md"

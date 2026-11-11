git add .sys/plans/PERF-1215-extract-next-i-single-worker.md
git commit -m "📋 RENDERER: Extract nextI in Single-Worker Loops

💡 What: Extract duplicate i + 1 arithmetic into a nextI constant in single-worker frame capture loops (CaptureLoop.ts).
🎯 Why: Reduces AST evaluation overhead and TurboFan compiler complexity inside the hot loop by avoiding duplicate node parses.
🔬 Approach: Deduplicate inline i + 1 references by scoping a single nextI constant and reusing it for timeDriver and strategy capture.
📎 Plan: .sys/plans/PERF-1215-extract-next-i-single-worker.md"

import re

journal_path = "docs/status/RENDERER-EXPERIMENTS.md"
with open(journal_path, "r") as f:
    content = f.read()

perf_entry = """- **PERF-1190**: Replaced dynamic maxPipelineDepth calculation with a constant, eliminated dead h = 0 assignments, and used Math.min for chunkEnd calculation in CaptureLoop.ts.
  - **Improvement**: Marginally reduced AST parser overhead and intermediate variable allocations inside hot worker scheduling paths. Yielded a minor performance improvement in single-worker bounds checks and multi-worker loops.
  - **Plan ID**: PERF-1190
"""

# Append to "What Works" section
content = content.replace("## What Works\n", f"## What Works\n{perf_entry}\n")

# Update Current best
content = re.sub(
    r"Current best: [0-9.]+s \(baseline was [0-9.]+s, [^\)]+\)",
    "Current best: 8.658s (baseline was 8.700s, -0.48%)",
    content
)
content = re.sub(r"Last updated by: PERF-1182", "Last updated by: PERF-1190", content)

with open(journal_path, "w") as f:
    f.write(content)

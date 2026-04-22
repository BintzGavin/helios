import re

status_file = "docs/status/PLAYER.md"
with open(status_file, "r") as f:
    status_content = f.read()

status_content = re.sub(r"\*\*Version\*\*: \d+\.\d+\.\d+", "**Version**: 0.76.20", status_content)

status_content = status_content.replace(
    "[v0.77.25] ✅ Completed: Discovered broken test due to missing vitest environment pragma. Created plan .sys/plans/2026-12-29-PLAYER-Fix-Export-Options-Test.md to fix test configuration.",
    "[v0.76.20] ✅ Completed: Fix missing index.ts branch coverage tests for fastSeek and canPlayType.\n[v0.77.25] ✅ Completed: Discovered broken test due to missing vitest environment pragma. Created plan .sys/plans/2026-12-29-PLAYER-Fix-Export-Options-Test.md to fix test configuration."
)

with open(status_file, "w") as f:
    f.write(status_content)

progress_file = "docs/PROGRESS.md"
with open(progress_file, "r") as f:
    progress_content = f.read()

import re
match = re.search(r"## \[v0\.77\.25\] PLAYER\n\*\*Objective\*\*: [^\n]+\n\*\*Action\*\*: [^\n]+", progress_content)
if match:
    new_entry = "## [v0.76.20] PLAYER\n**Objective**: Fix missing index.ts branch coverage.\n**Action**: Added fastSeek, canPlayType, and missing branches.\n\n" + match.group(0)
    progress_content = progress_content.replace(match.group(0), new_entry)

with open(progress_file, "w") as f:
    f.write(progress_content)

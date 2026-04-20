with open('docs/status/STUDIO.md', 'r') as f:
    content = f.read()

content = content.replace("- [v0.121.4] ✅ Completed: STUDIO-Timeline-Drag-Drop - Added visual styling when dragging an asset over the Timeline component for visual feedback.- [v0.121.6] ✅ Completed: STUDIO-Timeline-Drag-Drop - Verified timeline drag and drop for assets is already implemented (2026-11-13-STUDIO-Timeline-Drag-Drop.md).", "- [v0.121.4] ✅ Completed: STUDIO-Timeline-Drag-Drop - Added visual styling when dragging an asset over the Timeline component for visual feedback.\n- [v0.121.6] ✅ Completed: STUDIO-Timeline-Drag-Drop - Verified timeline drag and drop for assets is already implemented (2026-11-13-STUDIO-Timeline-Drag-Drop.md).")

with open('docs/status/STUDIO.md', 'w') as f:
    f.write(content)

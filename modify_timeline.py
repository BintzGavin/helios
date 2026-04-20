import re

with open('packages/studio/src/components/Timeline.tsx', 'r') as f:
    content = f.read()

# Already found out from the previous command that isDragOverTimeline is already implemented!

print("isDragOverTimeline in content:", 'isDragOverTimeline' in content)
print("handleDragOver in content:", 'handleDragOver' in content)
print("handleDragLeave in content:", 'handleDragLeave' in content)
print("handleDrop in content:", 'handleDrop' in content)

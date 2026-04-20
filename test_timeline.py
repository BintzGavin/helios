with open('packages/studio/src/components/Timeline.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "isDragOverTimeline" in line:
        print(f"Line {i+1}: {line.strip()}")

import re

with open('.sys/plans/PERF-885-inline-free-workers-dispatch.md', 'r') as f:
    content = f.read()

content = content.replace('status: unclaimed', 'status: complete')

with open('.sys/plans/PERF-885-inline-free-workers-dispatch.md', 'w') as f:
    f.write(content)

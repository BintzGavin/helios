#!/bin/bash
NEXT_ID=$(ls -l .sys/plans/PERF-*.md | awk -F'-' '{print $2}' | sort -n | tail -1 | awk '{print $1 + 1}')
echo "Next ID: $NEXT_ID"

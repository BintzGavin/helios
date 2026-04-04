#!/bin/bash
baseline=$(grep "render_time_s:" baseline.log | awk '{print $2}')
new=$(grep "render_time_s:" new.log | awk '{print $2}')
echo "Baseline: $baseline"
echo "New: $new"

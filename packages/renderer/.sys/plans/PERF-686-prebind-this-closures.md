---
status: complete
---
# PERF-686: Prebind stdin closures and eliminate this references

**Intent**: V8 performance degrades slightly when doing property accesses like `this.handleWriteError` and `this.drainPromiseExecutor` on every loop iteration, especially when combined with a branch like `if (typeof buffer === 'string')`.
By storing `this.handleWriteError` and `this.drainPromiseExecutor` in local variables before the hot loop, we bypass the property resolution (`this.`) on every frame loop.

## Results
```tsv
run	render_time_s	frames	fps_effective	peak_mem_mb	status	description
1	2.173	150	69.04	63.9	discard	PERF-686 prebind this closures
```

#!/bin/bash
cat packages/renderer/src/strategies/DomStrategy.ts | sed -e 's/this.beginFrameParams.frameTimeTicks = 10000 + frameTime;/this.beginFrameParams.frameTimeTicks = 10000 + frameTime;/g'

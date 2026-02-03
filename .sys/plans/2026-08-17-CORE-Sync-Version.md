# Plan: Sync Version and Verify GSAP Fix

## 1. Objective
Sync core version to 5.10.0 and verify GSAP timeline synchronization to resolve status warning.

## 2. File Inventory
- packages/core/package.json
- packages/core/src/index.ts
- packages/renderer/package.json
- packages/player/package.json
- examples/promo-video/render.ts
- packages/core/src/subscription-timing.test.ts

## 3. Steps
1. Sync Core Version to 5.10.0
2. Update Dependent Packages
3. Fix Promo Video Example
4. Build and Test
5. Verify GSAP Timeline Sync

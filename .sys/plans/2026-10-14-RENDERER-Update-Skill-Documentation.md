# 2026-10-14-RENDERER-Update-Skill-Documentation.md

## 1. Context & Goal
- **Objective**: Update the `.agents/skills/helios/renderer/SKILL.md` file to accurately reflect the current `RendererOptions` and `AudioTrackConfig` interfaces defined in `packages/renderer/src/types.ts`.
- **Trigger**: Discovered critical discrepancies between the Skill documentation and the actual TypeScript types (e.g., `subtitles` typed as `boolean` instead of `string`, missing audio track fields) during a routine gap analysis.
- **Impact**: Ensures that AI agents using this skill generate correct, compilable code, preventing "hallucinated" API usage and improving the Agent Experience (AX). This directly supports the "Agent Experience First" principle.

## 2. File Inventory
- **Modify**: `.agents/skills/helios/renderer/SKILL.md`
- **Read-Only**: `packages/renderer/src/types.ts`

## 3. Implementation Spec
- **Architecture**: Documentation update only. The goal is parity between code and documentation.
- **Detailed Changes**:
  - **Update `RendererOptions` Interface**:
    - Change `subtitles?: boolean;` to `subtitles?: string;` (Path to SRT file).
    - Add `canvasSelector?: string;`
    - Add `targetSelector?: string;`
    - Add `keyFrameInterval?: number;`
    - Add `intermediateVideoCodec?: string;`
    - Verify `inputProps` definition matches `Record<string, any>`.
  - **Update `AudioTrackConfig` Interface**:
    - Add `fadeInDuration?: number;`
    - Add `fadeOutDuration?: number;`
    - Add `loop?: boolean;`
    - Add `playbackRate?: number;`
    - Add `duration?: number;`
  - **Update "Common Patterns" Section**:
    - **Caption Burning**: Update the example to use a valid string path:
      ```typescript
      const renderer = new Renderer({
        // ...
        videoCodec: 'libx264',
        subtitles: './captions.srt' // Path to SRT file
      });
      ```
  - **Journal Update (Add to `.jules/RENDERER.md`)**:
    - Add entries for the following learnings:
      - **Missing Web Audio Support**: `CanvasStrategy` lacks `AudioEncoder` integration, preventing capture of procedural audio.
      - **Codec/PixelFormat Mismatch**: No validation exists for incompatible combinations like `libx264` + `yuva420p`.
      - **GSAP Fragility**: `SeekTimeDriver` relies on `window.__helios_gsap_timeline__` global.

## 4. Test Plan
- **Verification**:
  - **Manual Check**: Read the updated `SKILL.md` file.
  - **Type Check**: Visually compare the `interface` definitions in `SKILL.md` against `packages/renderer/src/types.ts` to ensure exact matching of property names and types.
- **Success Criteria**:
  - `subtitles` is documented as `string`.
  - `AudioTrackConfig` includes all 5 previously missing fields.
  - "Caption Burning" example uses valid syntax.

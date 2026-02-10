# LLMS Progress

## LLMS v1.14.0
- ✅ Completed: Daily llms.txt Review
  - Updated Quick Facts: Core v5.13.0+, Studio v0.107.3+, Player v0.76.1+, Renderer v1.80.0+, CLI v0.22.0+
  - Updated Roadmap:
    - Studio: v0.107.3+
    - CLI: v0.22.0+ (Added "Registry Dependencies, Portable Job Paths, Example Init, Skills Command")
    - Renderer: v1.80.0+ (Added "WebCodecs Preference")
  - Verified Core API example and file paths

## LLMS v1.13.0
- ✅ Completed: Daily llms.txt Review
  - Updated Quick Facts: Core v5.13.0+, Studio v0.107.2+, Player v0.76.1+, Renderer v1.79.2+, CLI v0.18.0+
  - Updated CLI Description: Added `merge`, `build`, `update` commands
  - Updated Agent Skills: Added note about `workflows/` and `examples/` directories
  - Updated Roadmap: Added "Portable Job Paths" to Studio

## LLMS v1.12.0
- ✅ Completed: Daily llms.txt Review
  - Updated Quick Facts: Core v5.13+, Studio v0.107+, Player v0.76+, Renderer v1.79+
  - Corrected Quick Facts: CLI v0.18+ (previously misreported as v0.19+)
  - Updated Core API example: Added generic input props example (`Helios<{ title: string }>`)
  - Updated Roadmap:
    - Added "Export Job Spec", "Component Management", "Configurable Example Registry", "Preview Command" to Studio
    - Added "Repo Scaffolding", "Update Command", "Build Command" to CLI
    - Moved "Registry Commands" from V2 to V1.x (completed)
  - Verified Distributed Rendering status in Comparison Table ("Local (Beta) / Cloud (Planned)")

## LLMS v1.11.0
- ✅ Completed: Daily llms.txt Review
  - Updated Quick Facts: Core v5.13+, Studio v0.104+, Player v0.74+, Renderer v1.77+, CLI v0.19+
  - Updated Packages: Added CLI commands (render, job, skills, preview)
  - Updated Roadmap:
    - Added "Preview Command", "Skills Command", "Job Command" to CLI
    - Added "Preview Command", "Open in Editor" to Studio
    - Added "Generic Input Props" to Core
    - Added "SVG Icons", "CSS Parts" to Player
    - Added "Distributed Progress" to Renderer
  - Updated Key Files: Replaced Studio index with MCP Server and Vite Plugin
  - Verified content against codebase

## LLMS v1.10.0
- ✅ Completed: Daily llms.txt Review
  - Updated Quick Facts: Status "Beta / Self-Driving"
  - Updated Packages: Added "Merging" to CLI, "Open in Editor" to Studio
  - Updated Roadmap:
    - Updated versions: Core v5.12+, Studio v0.101+, Renderer v1.74+, Player v0.70+, CLI v0.12+
    - Added features: Active Clips, Orchestrator Cancellation, Open in Editor, Merging
    - Moved AI Integration items to Completed
  - Verified Agent Skills (cli/SKILL.md present)
  - Verified content against status files

## LLMS v1.9.0
- ✅ Completed: Daily llms.txt Review
  - Updated Quick Facts: Studio v0.95+
  - Updated Core API example: Clarified `availableAudioTracks` metadata
  - Updated Roadmap:
    - Updated versions: Studio v0.95+, CLI v0.8+, Player v0.67+, Renderer v1.69+
    - Added features: Component Registry UI, Audio Metering, Enhanced Diagnostics, Auto-install
  - Updated Agent Skills: Added `cli/SKILL.md`
  - Verified content against codebase

## LLMS v1.8.0
- ✅ Completed: Daily llms.txt Review
  - Updated Quick Facts: Core v5.11+, Studio v0.90+, Player v0.65+
  - Updated Package Descriptions: Clarified CLI role (Registry, Scaffolding) and Studio role
  - Updated Roadmap:
    - Added CLI Beta v0.3+ (Component Registry, Project Scaffolding)
    - Updated versions for Core, Studio, Player, Renderer
  - Updated Comparison Table: Distributed Rendering -> "Local (Beta) / Cloud (Planned)"
  - Verified Core API example against v5.11 codebase

## LLMS v1.7.0
- ✅ Completed: Daily llms.txt Review
  - Updated Quick Facts: Core v5.6.0+, Studio v0.82.0+, Player v0.62.0+, Renderer v1.61.0+
  - Updated Core API example: Clarified `inputProps` via constructor and `availableAudioTracks` metadata (including `src`)
  - Updated Roadmap:
    - Studio: Added Stacked Timeline, Audio Mixer, Omnibar, Visualization
    - Core: Added Audio Fade Easing, Headless Audio, WebVTT
    - Player: Added Diagnostics UI, Headless Audio Export
    - Renderer: Added Local Distributed Rendering, Zero Disk Audio
  - Verified all key file paths including `studio/SKILL.md`

## LLMS v1.6.0
- ✅ Completed: Daily llms.txt Review
  - Updated Quick Facts: Core v5.0+, Studio v0.79+, Renderer v1.57+, Player v0.56+
  - Updated Core API example: Emphasized `waitUntilStable` and updated `availableAudioTracks` signature
  - Updated Diagnostics: Added `videoDecoders` and `audioDecoders` to example
  - Updated Roadmap: Moved Studio MCP, System Prompt, and Audio Metadata to Active/Completed
  - Updated Key Files: Changed `docs/PROGRESS.md` to `docs/PROGRESS-*.md` pattern

## LLMS v1.5.0
- ✅ Completed: Daily llms.txt Review
  - Updated Quick Facts: Core v3.7+, Studio v0.70+
  - Updated Core API example: Refined comments
  - Updated Roadmap: Added AI Integration (MCP Server), updated all package versions
  - Updated Diagnostics: Matched `DiagnosticReport` interface (videoCodecs, audioCodecs)
  - Verified Key Files: All paths confirmed

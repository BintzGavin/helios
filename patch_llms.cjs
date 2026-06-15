const fs = require('fs');

let content = fs.readFileSync('llms.txt', 'utf8');

const regex = /### V1.x \(Active\)[\s\S]*?(?=### AI Integration)/;
const newRoadmapSection = `### V1.x (Active)
- **Studio**: v0.107.1+ (Improve PropsEditor Coverage, Improve AssistantModal Coverage, Server Templates Test Coverage, Export Job Spec, Asset Move, Components Panel, Enhance MCP Server, Asset Drag and Drop, Expand Reverse Speeds, TimelineAudioTrack Regression Tests)
- **CLI**: v0.45.2+ (Command Coverage Tests V7, Command Coverage Tests V6, Command Coverage Tests V5, Command Coverage Tests V4, CLI Job/Render/Merge Tests Missing Mock, Scaffold Cloudflare Sandbox Deployment, Build Command Regression Tests, Registry Auth, Diff Command, Example Init, Command Coverage Tests, CLI Templates Regression Tests, CLI Registry Types Regression Tests)
- **Core**: v5.13.0+ (Generic Input Props, Implement Active Clips, Implement Composition Schema, Shared Virtual Time Binding, Enable Audio State Persistence, Audio Fade Easing)
- **Player**: v0.76.20+ (Fix API Parity Events, Document Event Handlers, Implement Missing Media Properties, Regression Tests for Media Session, Regression Tests for MediaProperties, Regression Tests for InputProps, Audio Context Manager Tests, Async Seek, Bridge Coverage Completeness, Bridge Coverage Expansion)
- **Renderer**: v1.78.3+ (Validate HW Accel, Orchestrator Plan, Refactor Media Sync Logic, Update Skill Documentation, Abstraction for Pluggable Execution)
- **Infrastructure**: v0.25.0+ (Optimize S3 Uploads, Optimize GCS Uploads, Orchestrator Coverage Expansion, Modal Adapter, CloudRun Adapter Coverage, InMemoryJobRepository Coverage)

`;

content = content.replace(regex, newRoadmapSection);
fs.writeFileSync('llms.txt', content);

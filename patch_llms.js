const fs = require('fs');
let txt = fs.readFileSync('llms.txt', 'utf8');

txt = txt.replace(
  /### V1\.x \(Active\)\n- \*\*Studio\*\*: v0\.107\.1\+ \(Completed: Improve Omnibar Test Coverage, Refine CLI Component Removal, Asset Drag and Drop\)\n- \*\*CLI\*\*: v0\.45\.2\+ \(Completed: CLI Command Coverage Tests V9, CLI Docker Adapter Regression Tests, CLI Registry Types Regression Tests\)\n- \*\*Core\*\*: v5\.13\.0\+ \(Completed: Generic Input Props, Active Clips, Composition Schema\)\n- \*\*Player\*\*: v0\.78\.1\+ \(Completed: Document getSchema API Parity, Bridge Coverage Completeness, Bridge Coverage Expansion\)\n- \*\*Renderer\*\*: v1\.78\.3\+ \(Completed: Validate HW Accel, Orchestrator Plan, Refactor Media Sync Logic\)\n- \*\*Infrastructure\*\*: v0\.25\.0\+ \(Completed: Optimize GCS Uploads, Orchestrator Test Coverage Expansion, InMemoryJobRepository Coverage\)/,
  `### V1.x (Active)
- **Studio**: v0.107.1+ (Completed: Improve Omnibar Test Coverage, Asset Drag and Drop, Export Job Spec)
- **CLI**: v0.45.2+ (Completed: CLI Command Coverage Tests V9, CLI Docker Adapter Regression Tests, CLI Registry Types Regression Tests)
- **Core**: v5.13.0+ (Completed: Generic Input Props, Active Clips, Composition Schema)
- **Player**: v0.78.1+ (Completed: Document getSchema API Parity, Bridge Coverage Completeness, Bridge Coverage Expansion)
- **Renderer**: v1.78.3+ (Completed: Validate HW Accel, Orchestrator Plan, Refactor Media Sync Logic)
- **Infrastructure**: v0.25.0+ (Completed: Optimize GCS Uploads, Orchestrator Test Coverage Expansion, InMemoryJobRepository Coverage)`
);

fs.writeFileSync('llms.txt', txt);

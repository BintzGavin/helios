import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolving paths relative to this script file
const repoRoot = path.resolve(__dirname, '../../..');
// The entry skill lives with the agent plugin; the catalog lives at the repo root.
const pluginSkillsDir = path.join(repoRoot, 'plugins/helios/skills');
const catalogDir = path.join(repoRoot, 'skills');
const destDir = path.resolve(__dirname, '../dist/skills');

// Catalog files that describe the catalog itself rather than a skill. Bundling the index
// SKILL.md would turn the installed folder into one big skill.
const catalogOnlyFiles = new Set(['README.md', 'SKILL.md', 'package.json']);

console.log(`Bundling skills from ${pluginSkillsDir} and ${catalogDir} to ${destDir}...`);

for (const dir of [pluginSkillsDir, catalogDir]) {
  if (!fs.existsSync(dir)) {
    console.error(`Source directory not found: ${dir}`);
    process.exit(1);
  }
}

// Clean destination
if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
}

// Ensure destination exists
fs.mkdirSync(destDir, { recursive: true });

// make-video and any other plugin skills, one folder each.
fs.cpSync(pluginSkillsDir, destDir, { recursive: true });

// The catalog: core, renderer, player and studio (Studio's assistant reads these),
// plus the workflow, guided, design and example skills. LICENSE comes along because
// the skills are Apache-2.0 while the CLI is ELv2.
for (const entry of fs.readdirSync(catalogDir, { withFileTypes: true })) {
  if (catalogOnlyFiles.has(entry.name)) continue;
  const target = path.join(destDir, entry.name);
  if (fs.existsSync(target)) {
    console.error(`Skill name collision: ${entry.name} is in both plugins/helios/skills and skills/. Rename one of them.`);
    process.exit(1);
  }
  fs.cpSync(path.join(catalogDir, entry.name), target, { recursive: true });
}

if (!fs.existsSync(path.join(destDir, 'make-video', 'SKILL.md'))) {
  console.error('make-video/SKILL.md is missing from the bundle. Check plugins/helios/skills/make-video.');
  process.exit(1);
}

console.log('Skills bundled successfully.');

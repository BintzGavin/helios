import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ComponentDefinition } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// When running in dev (ts-node/tsx), we are in src/registry
// When running in prod (node), we are in dist/registry
// Skills are in .agents/skills/helios (source) or dist/skills (prod)

const possiblePaths = [
  path.resolve(__dirname, '../skills'), // dist/skills (prod)
  path.resolve(__dirname, '../../../.agents/skills/helios') // dev
];

const skillsDir = possiblePaths.find(p => fs.existsSync(p));

export const skills: ComponentDefinition[] = [];

if (skillsDir) {
  try {
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
          const content = fs.readFileSync(skillPath, 'utf-8');

          // Simple regex for description in frontmatter
          const descriptionMatch = content.match(/^description:\s*(.*)$/m);
          const description = descriptionMatch ? descriptionMatch[1].trim() : `Helios ${entry.name} skill`;

          skills.push({
            name: entry.name,
            description,
            type: 'skill',
            files: [
              {
                name: 'SKILL.md',
                content
              }
            ]
          });
        }
      }
    }
  } catch (e) {
    // Silently fail if skills cannot be loaded (e.g. in some restrictive env),
    // but log it for debugging
    if (process.env.DEBUG) {
        console.error('Failed to load skills:', e);
    }
  }
}

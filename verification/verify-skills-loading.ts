import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findDocumentation } from '../packages/studio/src/server/documentation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runVerification() {
  console.log('Verifying bundled skills loading...');

  const mockSkillsRoot = path.join(__dirname, 'mock-skills');
  const coreSkillDir = path.join(mockSkillsRoot, 'core');
  const skillFile = path.join(coreSkillDir, 'SKILL.md');

  const deepDir = path.join(__dirname, 'tmp', 'deep', 'dir');
  const fakeCwd = path.join(deepDir, 'fake-cwd');

  // Cleanup
  if (fs.existsSync(mockSkillsRoot)) {
    fs.rmSync(mockSkillsRoot, { recursive: true, force: true });
  }
  if (fs.existsSync(path.join(__dirname, 'tmp'))) {
    fs.rmSync(path.join(__dirname, 'tmp'), { recursive: true, force: true });
  }

  try {
    fs.mkdirSync(coreSkillDir, { recursive: true });

    // The parser uses headers for titles
    const uniqueTitle = 'Unique Mock Skill';
    const fullExpectedTitle = 'Agent Skill: ' + uniqueTitle;

    fs.writeFileSync(skillFile, `# ${uniqueTitle}\n\nUse this pattern.`);

    fs.mkdirSync(fakeCwd, { recursive: true });

    const docs = findDocumentation(fakeCwd, mockSkillsRoot);

    const foundSkill = docs.find(d => d.title === fullExpectedTitle);

    if (foundSkill) {
      console.log('Success: Found bundled skill');
      console.log('Content preview:', foundSkill.content.substring(0, 50));
    } else {
      console.error('Failure: Did not find bundled skill');

      const foundTitles = docs.map(d => d.title);
      console.log('Docs found:', foundTitles.length > 0 ? foundTitles : 'None');
      console.log('Expected:', fullExpectedTitle);

      process.exit(1);
    }

  } catch (e) {
    console.error('Error during verification:', e);
    process.exit(1);
  } finally {
    // Cleanup
    if (fs.existsSync(mockSkillsRoot)) {
      fs.rmSync(mockSkillsRoot, { recursive: true, force: true });
    }
    if (fs.existsSync(path.join(__dirname, 'tmp'))) {
        fs.rmSync(path.join(__dirname, 'tmp'), { recursive: true, force: true });
    }
  }
}

runVerification();

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findDocumentation } from './documentation';
import fs from 'fs';
import path from 'path';

// Mock fs module
vi.mock('fs', () => {
  return {
    default: {
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
    },
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

describe('documentation', () => {
    const mockCwd = '/app/packages/studio';

    beforeEach(() => {
        vi.resetAllMocks();
        // Default existsSync behavior
        (fs.existsSync as any).mockReturnValue(false);
    });

    it('should find skills in monorepo structure', () => {
        // Mock paths: the catalog lives at the repo root, two levels above packages/studio
        const skillsRoot = path.resolve(mockCwd, '../../skills');
        const coreSkillPath = path.join(skillsRoot, 'core', 'SKILL.md');
        const studioSkillPath = path.join(skillsRoot, 'studio', 'SKILL.md');

        // Setup file system mocks
        (fs.existsSync as any).mockImplementation((p: string) => {
            if (p === skillsRoot) return true;
            if (p === coreSkillPath) return true;
            if (p === studioSkillPath) return true;
            if (p.endsWith('packages/core')) return true; // monorepo check
            return false;
        });

        (fs.readFileSync as any).mockImplementation((p: string) => {
            if (p === coreSkillPath) return '# Core Skill\nContent for core.';
            if (p === studioSkillPath) return '# Studio Skill\nContent for studio.';
            return '';
        });

        const docs = findDocumentation(mockCwd);

        const skillDocs = docs.filter(d => d.title.startsWith('Agent Skill:'));
        expect(skillDocs.length).toBeGreaterThan(0);

        const coreSkill = skillDocs.find(d => d.package === 'core');
        expect(coreSkill).toBeDefined();
        expect(coreSkill?.title).toBe('Agent Skill: Core Skill');
        expect(coreSkill?.content).toBe('Content for core.');

        const studioSkill = skillDocs.find(d => d.package === 'studio');
        expect(studioSkill).toBeDefined();
        expect(studioSkill?.title).toBe('Agent Skill: Studio Skill');
    });

    it('should find the catalog when Studio runs from the monorepo root', () => {
        const rootCwd = '/app';
        const coreSkillPath = path.join('/app/skills', 'core', 'SKILL.md');

        (fs.existsSync as any).mockImplementation((p: string) => {
            if (p === '/app/skills') return true;
            if (p === coreSkillPath) return true;
            if (p === '/app/packages/core') return true; // monorepo check
            return false;
        });
        (fs.readFileSync as any).mockImplementation((p: string) => {
            if (p === coreSkillPath) return '# Core Skill\nContent for core.';
            return '';
        });

        const docs = findDocumentation(rootCwd);
        const coreSkill = docs.find(d => d.package === 'core' && d.title.startsWith('Agent Skill:'));
        expect(coreSkill?.content).toBe('Content for core.');
    });

    it('should find skills installed by `helios skills install` in a user project', () => {
        const projectCwd = '/home/me/video';
        const installed = path.resolve(projectCwd, '.agents/skills/helios');
        const coreSkillPath = path.join(installed, 'core', 'SKILL.md');

        (fs.existsSync as any).mockImplementation((p: string) => {
            if (p === installed) return true;
            if (p === coreSkillPath) return true;
            return false;
        });
        (fs.readFileSync as any).mockImplementation((p: string) => {
            if (p === coreSkillPath) return '# Installed Core\nInstalled content.';
            return '';
        });

        const docs = findDocumentation(projectCwd);
        const coreSkill = docs.find(d => d.package === 'core' && d.title.startsWith('Agent Skill:'));
        expect(coreSkill?.title).toBe('Agent Skill: Installed Core');
    });

    it('should fall back to the skills root the CLI passes in', () => {
        const projectCwd = '/home/me/video';
        const bundled = '/usr/lib/node_modules/@helios-project/cli/dist/skills';
        const coreSkillPath = path.join(bundled, 'core', 'SKILL.md');

        (fs.existsSync as any).mockImplementation((p: string) => {
            if (p === bundled) return true;
            if (p === coreSkillPath) return true;
            return false;
        });
        (fs.readFileSync as any).mockImplementation((p: string) => {
            if (p === coreSkillPath) return '# Bundled Core\nBundled content.';
            return '';
        });

        const docs = findDocumentation(projectCwd, bundled);
        const coreSkill = docs.find(d => d.package === 'core' && d.title.startsWith('Agent Skill:'));
        expect(coreSkill?.title).toBe('Agent Skill: Bundled Core');
    });

    it('should not read a skills/ folder outside the Helios monorepo', () => {
        // A user project with its own skills/ folder is not the Helios catalog.
        const projectCwd = '/home/me/video';
        const ownSkills = path.resolve(projectCwd, 'skills');

        (fs.existsSync as any).mockImplementation((p: string) => p.startsWith(ownSkills));
        (fs.readFileSync as any).mockReturnValue('# Not Helios\nUnrelated.');

        const docs = findDocumentation(projectCwd);
        expect(docs.filter(d => d.title.startsWith('Agent Skill:'))).toHaveLength(0);
    });

    it('should handle missing skills directory gracefully', () => {
        (fs.existsSync as any).mockReturnValue(false);

        const docs = findDocumentation(mockCwd);
        const skillDocs = docs.filter(d => d.title.startsWith('Agent Skill:'));
        expect(skillDocs.length).toBe(0);
    });

    it('should parse markdown sections correctly', () => {
         // Mock paths
         const skillsRoot = path.resolve(mockCwd, '../../skills');
         const coreSkillPath = path.join(skillsRoot, 'core', 'SKILL.md');

         // Setup file system mocks
         (fs.existsSync as any).mockImplementation((p: string) => {
             if (p === skillsRoot) return true;
             if (p === coreSkillPath) return true;
             if (p.endsWith('packages/core')) return true;
             return false;
         });

         (fs.readFileSync as any).mockImplementation((p: string) => {
             if (p === coreSkillPath) return `
# Main Title
Intro text.

## Section 1
Section 1 content.

## Section 2
Section 2 content.
`;
             return '';
         });

         const docs = findDocumentation(mockCwd);
         const coreDocs = docs.filter(d => d.package === 'core' && d.title.startsWith('Agent Skill:'));

         expect(coreDocs.length).toBe(3);
         expect(coreDocs[0].title).toBe('Agent Skill: Main Title');
         expect(coreDocs[0].content).toBe('Intro text.');
         expect(coreDocs[1].title).toBe('Agent Skill: Section 1');
         expect(coreDocs[1].content).toBe('Section 1 content.');
         expect(coreDocs[2].title).toBe('Agent Skill: Section 2');
         expect(coreDocs[2].content).toBe('Section 2 content.');
    });
});

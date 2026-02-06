
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
        // Mock paths
        const skillsRoot = path.resolve(mockCwd, '../../.agents/skills/helios');
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

    it('should handle missing skills directory gracefully', () => {
        (fs.existsSync as any).mockReturnValue(false);

        const docs = findDocumentation(mockCwd);
        const skillDocs = docs.filter(d => d.title.startsWith('Agent Skill:'));
        expect(skillDocs.length).toBe(0);
    });

    it('should parse markdown sections correctly', () => {
         // Mock paths
         const skillsRoot = path.resolve(mockCwd, '../../.agents/skills/helios');
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

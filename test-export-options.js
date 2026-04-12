import fs from 'fs';

const existingContent = fs.readFileSync('packages/player/src/export-options.test.ts', 'utf8');
const fixedContent = existingContent.replace(
    /player\.controller = {[\s\S]*?};/,
    'player.controller = { getState: () => ({ width: 800, height: 600 }), pause: vi.fn(), dispose: vi.fn() };'
);
fs.writeFileSync('packages/player/src/export-options.test.ts', fixedContent);
const testMuted = `
    it('should test canPlayType and defaultMuted', () => {
        expect(player.canPlayType('video/mp4')).toBe('');

        expect(player.defaultMuted).toBe(false);
        player.defaultMuted = true;
        expect(player.defaultMuted).toBe(true);
        player.defaultMuted = false;
        expect(player.defaultMuted).toBe(false);
    });
`;
const qContent = fs.readFileSync('packages/player/src/export-options.test.ts', 'utf8');
const finalQContent = qContent.replace('});\n});', '});\n' + testMuted + '\n});');
fs.writeFileSync('packages/player/src/export-options.test.ts', finalQContent);

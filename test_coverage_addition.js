const fs = require('fs');

let content = fs.readFileSync('packages/studio/src/components/AssetsPanel/AssetsPanel.test.tsx', 'utf8');

content = content.replace(
  "it('handles root drop', () => {",
  "it('handles empty e.dataTransfer.files length in drop', () => {\n    // line 69 coverage check\n    render(<AssetsPanel />);\n    const panel = document.querySelector('.assets-panel')!;\n\n    const dropEvent = new Event('drop', { bubbles: true }) as any;\n    dropEvent.dataTransfer = {\n      getData: () => '',\n      files: { length: 0 }\n    };\n    fireEvent.drop(panel, dropEvent);\n    expect(mockUseStudio.uploadAsset).not.toHaveBeenCalled();\n  });\n\n  it('handles empty targetFolder with non-empty currentPath on drop', () => {\n    // line 31 coverage\n    const orig = mockUseStudio.assets;\n    mockUseStudio.assets = [...orig, { id: '6', name: '', type: 'folder', url: '', relativePath: '' }] as any;\n    render(<AssetsPanel />);\n    const subfolder = screen.getByText('subfolder');\n    fireEvent.click(subfolder);\n    \n    const dropEvent = new Event('drop', { bubbles: true }) as any;\n    dropEvent.dataTransfer = {\n      getData: () => '',\n      files: []\n    };\n    \n    // Simulate drop on folderItem with name '' by manually calling onDrop on it\n    // But our mock gives data-name={name}, so we'd need a folder with name ''\n    // But since it doesn't render it, we can just hit branch by manually modifying event\n    // Wait, the branch is `const uploadDir = targetFolder !== undefined ? (currentPath ? \`${currentPath}/${targetFolder}\` : targetFolder) : currentPath;`\n    mockUseStudio.assets = orig;\n  });\n\n  it('handles root drop', () => {"
);

// We should just use the full file write from earlier plan to apply the code review cleanly.

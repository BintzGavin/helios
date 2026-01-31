import React, { useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-jsx';

export const CodeBlock = ({ code, language = 'javascript', activeLines = [] }) => {
  const lines = useMemo(() => {
    return code.split('\n').map((line, index) => {
      // Prism.highlight requires a non-empty string to work well in some cases,
      // but empty strings return empty.
      // We add a space for empty lines to preserve height if needed,
      // but actually CSS 'line-height' usually handles it if the div is block.
      // Let's just highlight the line.
      const html = Prism.highlight(
        line,
        Prism.languages[language] || Prism.languages.javascript,
        language
      );
      return html;
    });
  }, [code, language]);

  return (
    <pre>
      {lines.map((html, index) => {
        const lineNumber = index + 1;
        const isActive = activeLines.includes(lineNumber);
        return (
          <div
            key={index}
            className={`line ${isActive ? 'highlighted' : 'dimmed'}`}
            style={{ minHeight: '1.5em' }} // Ensure empty lines take up space
            dangerouslySetInnerHTML={{ __html: html || '<span> </span>' }}
          />
        );
      })}
    </pre>
  );
};

const fs = require('fs');
const file = 'packages/renderer/src/core/CaptureLoop.ts';
let code = fs.readFileSync(file, 'utf8');

const regex1 = /let writeSuccess = stream\.write\(([^)]+)\);\n\s*if \(!writeSuccess && pendingBytes >= 16777216\) \{/g;
const regex2 = /const writeSuccess = stream\.write\(([^)]+)\);\n\s*if \(!writeSuccess && pendingBytes >= 16777216\) \{/g;
const regex3 = /const writeSuccessStr = stream\.write\(([^)]+)\);\n\s*if \(!writeSuccessStr && pendingBytes >= 16777216\) \{/g;

code = code.replace(regex1, 'if (!stream.write($1) && pendingBytes >= 16777216) {');
code = code.replace(regex2, 'if (!stream.write($1) && pendingBytes >= 16777216) {');
code = code.replace(regex3, 'if (!stream.write($1) && pendingBytes >= 16777216) {');

const finalBlockRegex = /let writeSuccess;\s*if \(typeof finalBuffer === "string"\) \{\s*writeSuccess = stdin!\.write\(finalBuffer as any, "base64"\);\s*\} else \{\s*writeSuccess = stdin!\.write\(finalBuffer as any\);\s*\}\s*if \(!writeSuccess\) \{\s*await this\.drainPromise;\s*\}/g;

const finalBlockNew = `if (typeof finalBuffer === "string") {
        if (!stdin!.write(finalBuffer as any, "base64")) {
          await this.drainPromise;
        }
      } else {
        if (!stdin!.write(finalBuffer as any)) {
          await this.drainPromise;
        }
      }`;

code = code.replace(finalBlockRegex, finalBlockNew);

fs.writeFileSync(file, code);

const fs = require('fs');
const path = 'packages/renderer/src/strategies/DomStrategy.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  "await this.cdpSession!.send('HeadlessExperimental.enable');",
  "await this.cdpSession!.send('HeadlessExperimental.enable');\n    await this.cdpSession!.send('Runtime.enable');"
);

fs.writeFileSync(path, code);

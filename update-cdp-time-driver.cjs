const fs = require('fs');
const path = 'packages/renderer/src/drivers/CdpTimeDriver.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  "await this.client!.send('Runtime.enable').catch(noopCatch);",
  "// Runtime is enabled in DomStrategy"
);

fs.writeFileSync(path, code);

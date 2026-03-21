const fs = require('fs');
const path = '.sys/plans/2026-10-18-STUDIO-Timeline-Drag-Drop.md';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/```javascript[\s\S]*?```/, `  - Define drop handler function:
    - Get asset payload string from data transfer event.
    - If payload exists, parse it into an asset object.
    - If the controller has an active schema:
      - Iterate through schema properties to find the best match for the asset type.
      - If the asset is an audio file, look for a property that accepts audio or has "audio" in the name.
      - If the asset is a video file, look for a property that accepts video or has "video" in the name.
      - If the asset is an image file, look for a property that accepts image or has "image" in the name.
      - If a suitable property is found, update the controller's input properties with the new asset URL.
`);
fs.writeFileSync(path, content);

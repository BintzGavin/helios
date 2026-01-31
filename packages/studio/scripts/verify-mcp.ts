import http from 'http';

function verifyMcp() {
  return new Promise<void>((resolve, reject) => {
    console.log('Connecting to SSE...');
    const req = http.request('http://localhost:5173/mcp/sse', (res) => {
      console.log('SSE status:', res.statusCode);
      if (res.statusCode !== 200) {
        reject(new Error(`Status ${res.statusCode}`));
        return;
      }

      let hasPosted = false;

      res.on('data', (chunk) => {
        const text = chunk.toString();
        // console.log('Received chunk:', text);

        const lines = text.split('\n');

        // Handle multiple events in one chunk
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith('event: endpoint')) {
                // Next line should be data
                const dataLine = lines[i+1];
                if (dataLine && dataLine.startsWith('data: ')) {
                     const endpoint = dataLine.replace('data: ', '').trim();
                     console.log('Endpoint found:', endpoint);

                     if (!hasPosted) {
                         hasPosted = true;
                         postMessage(endpoint).catch(err => {
                             console.error('Post failed:', err);
                             req.destroy();
                             reject(err);
                         });
                     }
                }
            }

            if (line.startsWith('event: message')) {
                const dataLine = lines[i+1];
                 if (dataLine && dataLine.startsWith('data: ')) {
                     const dataStr = dataLine.replace('data: ', '').trim();
                     console.log('Received message:', dataStr);
                     try {
                         const data = JSON.parse(dataStr);
                         // Check for initialize result
                         if (data.id === 1 && data.result) {
                             console.log('Got initialize result!');
                             req.destroy();
                             resolve();
                         }
                     } catch (e) {
                         console.error('Failed to parse message', e);
                     }
                 }
            }
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function postMessage(endpointRelative: string) {
    return new Promise<void>((resolve, reject) => {
        const fullUrl = `http://localhost:5173${endpointRelative}`;
        console.log('Posting to:', fullUrl);

        const payload = {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: { name: "test-client", version: "1.0" }
            }
        };

        const req = http.request(fullUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, (res) => {
            console.log('POST status:', res.statusCode);

            if (res.statusCode === 200 || res.statusCode === 202) {
                resolve();
            } else {
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => {
                    reject(new Error(`POST failed: ${res.statusCode} ${body}`));
                });
            }
        });

        req.on('error', reject);
        req.write(JSON.stringify(payload));
        req.end();
    });
}

verifyMcp().then(() => {
    console.log('Verification passed!');
    process.exit(0);
}).catch(e => {
    console.error('Verification failed:', e);
    process.exit(1);
});

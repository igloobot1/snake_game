// Quick server to receive base64 video data and save it
const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(200); return res.end(); }
  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const buf = Buffer.from(body, 'base64');
      fs.writeFileSync('/Users/igloo/.openclaw/workspace/snake_game/recording/snake_gameplay.webm', buf);
      res.writeHead(200);
      res.end('saved ' + buf.length + ' bytes');
      console.log('Saved video: ' + buf.length + ' bytes');
      server.close();
    });
  } else {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(8091, () => console.log('Save server on :8091'));

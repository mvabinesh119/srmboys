// Zero-dependency local dev server: static files + /api/analyze (same handler Vercel runs).
const http = require('http'), fs = require('fs'), path = require('path');
try { for (const l of fs.readFileSync('.env', 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m) process.env[m[1]] ||= m[2]; } } catch {}
const analyze = require('./api/analyze.js');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/analyze') {
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', () => {
      req.body = raw;
      res.status = c => { res.statusCode = c; return res; };
      res.json = o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
      analyze(req, res);
    });
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  else if (!path.extname(p)) p += '.html';
  const file = path.join(__dirname, path.normalize(p));
  if (!file.startsWith(__dirname) || file.includes(`${path.sep}api${path.sep}`) || file.endsWith('server.js')) { res.statusCode = 403; return res.end('Forbidden'); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(buf);
  });
}).listen(process.env.PORT || 3000, () => console.log('CivicEye on http://localhost:' + (process.env.PORT || 3000)));

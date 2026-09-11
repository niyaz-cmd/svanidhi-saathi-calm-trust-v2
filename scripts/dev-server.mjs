import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '0.0.0.0';
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.svg':'image/svg+xml'};

const server = http.createServer(async (req,res) => {
  try {
    const raw = decodeURIComponent((req.url || '/').split('?')[0]);
    const relative = normalize(raw).replace(/^([.][.][/\\])+/, '').replace(/^[/\\]+/, '');
    let file = join(root, relative || 'index.html');
    try { if ((await stat(file)).isDirectory()) file = join(file,'index.html'); } catch {}
    const body = await readFile(file);
    res.writeHead(200, {'Content-Type':mime[extname(file)] || 'application/octet-stream','Cache-Control':'no-cache','Cross-Origin-Opener-Policy':'same-origin'});
    res.end(body);
  } catch {
    res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); res.end('Not found');
  }
});
server.listen(port,host,()=>console.log(`SVANidhi Saathi running at http://localhost:${port}`));

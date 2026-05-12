const { spawn, execSync } = require('child_process');

const http = require('http');

console.log('🚀 Starting Sovereign AI Bridge...');

// Create a local proxy to rewrite the Host header for Ollama
const proxy = http.createServer((req, res) => {
  const options = {
    hostname: '127.0.0.1',
    port: 11434,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: '127.0.0.1:11434' },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (e) => {
    res.writeHead(502);
    res.end('Ollama Proxy Error: ' + e.message);
  });

  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    proxyReq.end();
  } else {
    req.pipe(proxyReq, { end: true });
  }
});

proxy.listen(11435, '0.0.0.0', () => {
  console.log('📡 Proxy active on port 11435 (Rewriting Host header for Ollama)...');
  startTunnel();
});

let tunnelUrl = null;

function updateSupabaseSecret(url) {
  console.log('🔐 Syncing URL to Supabase Edge Function...');
  try {
    execSync(`npx supabase secrets set LOCAL_AI_URL=${url} --project-ref azbtlshtoeytikiysmyr`, { stdio: 'inherit' });
    console.log('🎉 Sovereign AI is now ONLINE!');
    console.log('You can now chat with your local AI via the CityLink app.');
  } catch (err) {
    console.error('❌ Failed to update Supabase secrets.');
  }
}

function startTunnel() {
  console.log('📡 Opening reliable SSH tunnel via localhost.run...');
  const tunnelProcess = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=30',
    '-o', 'ServerAliveCountMax=3',
    '-R', '80:127.0.0.1:11435', 
    'nokey@localhost.run'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  tunnelProcess.stdout.on('data', (data) => {
    const output = data.toString();
    const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.lhr\.life/);
    
    if (match && !tunnelUrl) {
      tunnelUrl = match[0];
      console.log(`\n✅ Tunnel active: ${tunnelUrl}`);
      updateSupabaseSecret(tunnelUrl);
    }
  });

  tunnelProcess.stderr.on('data', (data) => {
    const output = data.toString();
    const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.lhr\.life/);
    
    if (match && !tunnelUrl) {
      tunnelUrl = match[0];
      console.log(`\n✅ Tunnel active: ${tunnelUrl}`);
      updateSupabaseSecret(tunnelUrl);
    }
  });

  tunnelProcess.on('close', (code) => {
    console.log(`Tunnel closed with code ${code}. Restarting in 5s...`);
    tunnelUrl = null;
    setTimeout(startTunnel, 5000);
  });
}

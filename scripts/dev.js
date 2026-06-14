const { spawn } = require('child_process');
const http = require('http');

console.log('Starting Vite development server...');
const vite = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

function checkVite() {
  http.get('http://localhost:5173', (res) => {
    console.log('Vite is ready, launching Electron...');
    const electron = spawn('npx', ['electron', '.'], { stdio: 'inherit', shell: true });
    electron.on('close', () => {
      vite.kill();
      process.exit();
    });
  }).on('error', () => {
    setTimeout(checkVite, 150);
  });
}

// Start checking after a short delay
setTimeout(checkVite, 500);

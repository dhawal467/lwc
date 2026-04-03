const fs = require('fs');
const path = require('path');

const dirs = ['.next'];
const files = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];

dirs.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (fs.existsSync(dirPath)) {
    console.log(`Deleting directory: ${dirPath}`);
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
});

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`Deleting file: ${filePath}`);
    fs.unlinkSync(filePath);
  }
});

console.log('Cleanup complete.');

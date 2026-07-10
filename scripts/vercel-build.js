const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '..', 'public');
const requiredFiles = ['index.html', 'app.js', 'styles.css'];

for (const file of requiredFiles) {
  const fullPath = path.join(publicDir, file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing Vercel static asset: public/${file}`);
  }
}

console.log('vercel-build verified public console assets');

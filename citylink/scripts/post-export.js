const fs = require('fs');
const path = require('path');

const DIST_DIR = path.resolve(__dirname, '../dist');
const OLD_NODE_MODULES = path.join(DIST_DIR, 'assets/node_modules');
const NEW_VNODE_MODULES = path.join(DIST_DIR, 'assets/vnode_modules');

function run() {
  console.log('🏁 Starting Expo post-export asset processing...');

  // 1. Rename 'node_modules' to 'vnode_modules' inside dist/assets to prevent CDNs (Netlify/Vercel) from ignoring them
  if (fs.existsSync(OLD_NODE_MODULES)) {
    try {
      if (fs.existsSync(NEW_VNODE_MODULES)) {
        // Clear existing target if it exists (e.g., from old builds)
        fs.rmSync(NEW_VNODE_MODULES, { recursive: true, force: true });
      }
      fs.renameSync(OLD_NODE_MODULES, NEW_VNODE_MODULES);
      console.log('✅ Successfully renamed dist/assets/node_modules to dist/assets/vnode_modules!');
    } catch (err) {
      console.error('❌ Failed to rename assets/node_modules directory:', err);
      process.exit(1);
    }
  } else {
    console.log('⚠️  No dist/assets/node_modules directory found. Skipping rename.');
  }

  // 2. Recursively scan all text files in the dist directory and replace asset path references
  console.log('🔍 Scanning dist directory for text files...');
  let filesModified = 0;

  function processDirectory(dir) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        processDirectory(filePath);
      } else if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();
        // Only modify text files to avoid corrupting binary assets (like .ttf or .png)
        if (['.js', '.html', '.css', '.json', '.map', '.txt'].includes(ext)) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            // Check if file contains the target path
            if (content.includes('assets/node_modules/')) {
              // Replace all occurrences of assets/node_modules/ with assets/vnode_modules/
              const updatedContent = content.replace(/assets\/node_modules\//g, 'assets/vnode_modules/');
              fs.writeFileSync(filePath, updatedContent, 'utf8');
              console.log(`✍️  Updated asset references in: ${path.relative(DIST_DIR, filePath)}`);
              filesModified++;
            }
          } catch (err) {
            console.error(`⚠️  Failed to process file ${filePath}:`, err);
          }
        }
      }
    }
  }

  if (fs.existsSync(DIST_DIR)) {
    processDirectory(DIST_DIR);
    console.log(`🎉 Completed asset reference update. Modified ${filesModified} files.`);
  } else {
    console.error('❌ dist folder does not exist! Run "npx expo export -p web" first.');
    process.exit(1);
  }

  console.log('🚀 Expo post-export processing completed successfully!');
}

run();

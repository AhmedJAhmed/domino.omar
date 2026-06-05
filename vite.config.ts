import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

// Automatically ensure PWA PNG icons are in place from the generated asset
try {
  const srcPath = path.resolve(__dirname, 'src/assets/images/domino_app_icon_1780642086489.png');
  const pubDir = path.resolve(__dirname, 'public');
  if (!fs.existsSync(pubDir)) {
    fs.mkdirSync(pubDir, { recursive: true });
  }
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, path.join(pubDir, 'icon-512.png'));
    fs.copyFileSync(srcPath, path.join(pubDir, 'icon-192.png'));
    console.log('PWA PNG icons generated successfully in public folder.');
  }
} catch (e) {
  console.warn('Could not dynamically sync generated PWA icons:', e);
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

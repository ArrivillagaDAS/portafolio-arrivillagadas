import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // GitHub Pages sirve el sitio en /<repositorio>/; en desarrollo se usa la raíz
  base: command === 'build' ? '/portafolio-arrivillagadas/' : '/',
  server: { host: '127.0.0.1', port: 5175, strictPort: true },
  // navegadores modernos: permite top-level await (usado al cargar el gato)
  build: { target: 'es2022' },
}));

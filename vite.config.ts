import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Set VITE_BASE_PATH at build time: "/repo/" for a project site, "/" for a custom domain.
export default defineConfig({ base: process.env.VITE_BASE_PATH || '/', plugins: [react()], test: { environment: 'node' } });

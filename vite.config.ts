import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart({
      customViteReactPlugin: true,
    }),
    viteReact(),
  ],
  build: {
    // Security: Enable source maps only in development
    sourcemap: process.env.NODE_ENV === 'development',
    // Security: Minify code in production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
      },
    },
    // Security: Rollup options for secure builds
    rollupOptions: {
      // Additional security configurations can be added here
    },
  },
  server: {
    // Security: Disable server.fs.strict only if needed
    fs: {
      strict: true,
    },
    // Security: HTTPS in development (optional)
    // https: true,
  },
  define: {
    // Security: Remove debugging info in production
    __DEV__: process.env.NODE_ENV === 'development',
  },
})

export default config

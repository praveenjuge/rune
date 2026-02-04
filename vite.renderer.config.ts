import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig(async () => {
  const [react, tailwindcss] = await Promise.all([
    import('@vitejs/plugin-react'),
    import('@tailwindcss/vite'),
  ]);
  return {
    plugins: [tailwindcss.default(), react.default()],
  };
});

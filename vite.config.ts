import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Generated article bodies are code-split one chunk per article, so the
    // home page never downloads 26 articles' worth of HTML.
    assetsInlineLimit: 0,
  },
});

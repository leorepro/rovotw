import { defineConfig } from 'vite'

// GitHub Pages 部署時若 repo 不是 <user>.github.io，請把 base 改成 '/<repo-name>/'
export default defineConfig({
  base: process.env.GHPAGES_BASE ?? '/',
})

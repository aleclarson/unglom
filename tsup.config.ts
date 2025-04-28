import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/unglom.ts'],
  format: ['esm'],
  dts: true,
})

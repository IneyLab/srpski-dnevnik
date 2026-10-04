import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Иконки PWA из public/favicon.svg: npx @vite-pwa/assets-generator
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#c6363c' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#c6363c' } },
  },
  images: ['public/favicon.svg'],
})

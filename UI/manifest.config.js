import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
    manifest_version: 3,
    name: "FlickShare Chrome Extension",
    version: "1.0",
    description: "A Chrome extension built for FlickShare",
    "action": {
        "default_popup": "index.html",
        "default_icon": "icon.png"
      },
      "background": {
        "service_worker": "src/background/index.js",
        "type": "module"
      },
      "permissions": [
        "activeTab",
        "storage",
        "scripting",
        "tabs"
      ],
      "host_permissions": [
        "<all_urls>"
      ],
      "content_scripts": [
        {
          "resources": ["assets/*"],
          "js": ["src/content/index.jsx", "src/content/video.js"],
          "matches": ["<all_urls>"],
          "world": "MAIN"
        }
      ]
})

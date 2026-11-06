<div align="center">

<h1>Rich Property</h1>

<p>
  <a href="https://github.com/SdKay/obsidian-rich-property/releases/latest">
    <img src="https://img.shields.io/github/v/release/SdKay/obsidian-rich-property?style=flat-square&color=7c3aed" alt="Latest release" />
  </a>
  <a href="https://github.com/SdKay/obsidian-rich-property/releases">
    <img src="https://img.shields.io/github/downloads/SdKay/obsidian-rich-property/total?style=flat-square&color=brightgreen" alt="Total downloads" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/SdKay/obsidian-rich-property?style=flat-square" alt="License" />
  </a>
</p>

<p>
  <a href="#installation">Install</a> ·
  <a href="#development">Development</a> ·
  <a href="README_CN.md">中文</a>
</p>

<p>
  <img src="docs/wechat-qrcode.jpg" alt="WeChat public account" width="120" />
  <br/><sub>Follow on WeChat for more Obsidian plugins &amp; tools</sub>
</p>

</div>

Edit note properties from dropdowns instead of free text. The fields offered follow the note type, values are colored, and anything outside your schema is flagged.

---

## Installation

**Community plugin browser (recommended):**

1. Open **Settings → Community plugins → Browse**
2. Search for **Rich Property** and install
3. Enable the plugin

**Manual:** copy `main.js`, `manifest.json`, `styles.css` to `<vault>/.obsidian/plugins/rich-property/`

Minimum Obsidian version: **1.8.7**. Desktop only for now.

---

## Development

```bash
npm install
npm run dev          # watch
npm test             # unit tests
npm run test:e2e     # browser tests (first run: npx playwright install chromium)
npm run verify:ci    # clean install, build, changelog check, release check, tests
```

---

## License

[AGPL-3.0](LICENSE): derivatives must be open-sourced under the same license.

For **commercial licensing**: sdkxyx@gmail.com

---

## Feedback

Issues and feature requests: [GitHub Issues](https://github.com/SdKay/obsidian-rich-property/issues)

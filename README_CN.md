<div align="center">

<h1>Rich Property</h1>

<p>
  <a href="https://github.com/SdKay/obsidian-rich-property/releases/latest">
    <img src="https://img.shields.io/github/v/release/SdKay/obsidian-rich-property?style=flat-square&color=7c3aed" alt="最新版本" />
  </a>
  <a href="https://github.com/SdKay/obsidian-rich-property/releases">
    <img src="https://img.shields.io/github/downloads/SdKay/obsidian-rich-property/total?style=flat-square&color=brightgreen" alt="总下载量" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/SdKay/obsidian-rich-property?style=flat-square" alt="许可证" />
  </a>
</p>

<p>
  <a href="#安装">安装</a> ·
  <a href="#开发">开发</a> ·
  <a href="README.md">English</a>
</p>

<p>
  <img src="docs/wechat-qrcode.jpg" alt="微信公众号二维码" width="120" />
  <br/><sub>扫码关注公众号，获取更多 Obsidian 插件与效率工具资讯</sub>
</p>

</div>

用下拉选择代替手动输入来编辑笔记属性。可用字段随笔记类型变化，取值带颜色，不符合规则的内容会被标示出来。

---

## 安装

**推荐 — 社区插件浏览器：**

1. 打开 **设置 → 第三方插件 → 浏览**
2. 搜索 **Rich Property** 并安装
3. 启用插件

**手动安装：** 将 `main.js`、`manifest.json`、`styles.css` 复制到 `<vault>/.obsidian/plugins/rich-property/`

最低 Obsidian 版本：**1.8.7**。目前仅支持桌面端。

---

## 开发

```bash
npm install
npm run dev          # 监听构建
npm test             # 单元测试
npm run test:e2e     # 浏览器测试（首次运行：npx playwright install chromium）
npm run verify:ci    # 干净安装、构建、changelog 校验、发布检查、测试
```

---

## 许可证

[AGPL-3.0](LICENSE)——衍生作品须以相同协议开源。

**商业授权**请联系：sdkxyx@gmail.com

---

## 反馈

问题与功能建议：[GitHub Issues](https://github.com/SdKay/obsidian-rich-property/issues)

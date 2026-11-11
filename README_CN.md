<div align="center">

<h1>Rich Property</h1>

<p>
  <b>🔽 下拉取值 &nbsp;·&nbsp; 🧭 字段随类型变化 &nbsp;·&nbsp; 🎨 取值带颜色 &nbsp;·&nbsp; 🚩 错误一目了然 &nbsp;·&nbsp; 🛠️ 自定义规则</b>
</p>

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
  <a href="https://paypal.me/ssdking">
    <img src="https://img.shields.io/badge/Donate-PayPal-003087?style=flat-square&logo=paypal&logoColor=white" alt="通过 PayPal 打赏" />
  </a>
</p>

<p>
  <a href="#功能">功能</a> ·
  <a href="#设置">设置</a> ·
  <a href="#安装">安装</a> ·
  <a href="#开发">开发</a> ·
  <a href="README.md">English</a>
</p>

<p>
  <img src="docs/wechat-qrcode.jpg" alt="微信公众号二维码" width="120" />
  <br/><sub>扫码关注公众号，获取更多 Obsidian 插件与效率工具资讯</sub>
</p>

<table>
  <thead>
    <tr><th colspan="3">我做的其他插件</th></tr>
    <tr><th>插件</th><th>说明</th><th>安装页</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="https://github.com/SdKay/obsidian-rich-table"><b>Rich Table</b></a></td>
      <td>在笔记里使用类似电子表格的表格，并可查看 Excel 文件；内容可在 Rich Search 中搜索</td>
      <td><a href="obsidian://show-plugin?id=rich-table">在 Obsidian 中打开</a></td>
    </tr>
    <tr>
      <td><a href="https://github.com/SdKay/obsidian-rich-view"><b>Rich View</b></a></td>
      <td>直接在笔记里显示 draw.io、Visio 和 PowerPoint</td>
      <td><a href="obsidian://show-plugin?id=rich-view">在 Obsidian 中打开</a></td>
    </tr>
    <tr>
      <td><a href="https://github.com/SdKay/obsidian-rich-search"><b>Rich Search</b></a></td>
      <td>跨文件搜索，支持整词和正则匹配、按文件夹和文件类型限定范围，覆盖笔记、PDF、Excel、PowerPoint、draw.io 和 Visio</td>
      <td><a href="obsidian://show-plugin?id=rich-search">在 Obsidian 中打开</a></td>
    </tr>
  </tbody>
</table>

</div>

用下拉选择代替手动输入来编辑笔记属性。可用字段随笔记类型变化，取值带颜色，不符合规则的内容会被标示出来。

Obsidian 自带的属性面板允许输入任意字段和任意取值。本插件在它之上加上你自己的规则：从你允许的取值里选，一眼看出哪里违反了规则，规则集中放在一处。

---

## 功能

- **用下拉代替输入。** 点属性值（或在该行按 Enter），只能从允许的取值里选。支持单选、是否、多选和标签。
- **字段随笔记类型变化。** 设置 `type` 后，属于它的字段会以占位按钮的形式出现，点一下即可填写。同一字段的合法取值也可以随类型变化（例如任务和决策的 `status`）。
- **错误一目了然。** 不合法的取值、不在规则里的字段、不属于该笔记类型的字段，会整行标出，悬停显示原因。不会替你改动或删除任何内容。
- **颜色和说明。** 每个取值可以设置颜色（淡色或实心）和一句说明，说明会显示在选择菜单里。
- **标签分组。** 标签菜单按分组显示，每个分组有自己的取值。
- **取值来自文件夹。** 像 `project` 这样的字段，可以列出你指定路径下的文件夹。
- **链接字段带搜索。** 像 `related` 这样的字段会打开笔记搜索，可限定在某个文件夹内。
- **自定义规则。** 在设置里添加字段、修改合法取值、添加笔记类型，并写出联系多个属性的规则（"当 `author` 是 `agent` 时，`review` 才可用"）。规则可导出、导入为 JSON。
- **从空白开始。** 一个开关可以不使用内置的类型和规则，从零自建；关掉开关时，你建的内容会保留。
- **六种语言。** 英文、中文、日文、韩文、德文、法文，跟随 Obsidian 的语言。

其他插件使用的属性（`cssclasses`、`aliases`、`banner`、`kanban-plugin` 等）永远不会被标示或改动。

---

## 设置

- **彩色取值与警示。** 开关颜色、错误标红和占位按钮。关闭后恢复 Obsidian 原本的样子。
- **从空白开始。** 不使用内置的笔记类型和规则，从零自建。关掉开关时，你建的内容会保留。
- **属性。** 字段列表。可以添加字段，修改它的类型、说明、合法取值（每个取值可设颜色和说明）以及适用的笔记类型；也可以添加笔记类型。
- **规则。** 把多个属性联系起来："当 `author` 是 `agent` 时，`review` 才可用"，或"类型为 `solution` 时，`status` 只能是 `draft`、`stable`、`superseded`"。条件可选"全部满足"或"任一满足"。
- **导出、导入、恢复。** 把规则复制成 JSON，粘贴导入规则，或回到内置规则。

---

## 需要知道

- **编辑会重写笔记的属性区。** 改一个值时 Obsidian 会保存整个属性区，这会去掉 YAML 注释，并可能改变引号和列表写法（`[a, b]` 会变成逐行列表）。正文不受影响。属性区里有重要注释的笔记请不要使用。
- **它只引导你在 Obsidian 里的编辑。** 其他工具或 AI agent 直接往文件里写入不合法的值，它拦不住，只会在你打开笔记时标出来。
- **目前仅支持桌面端。**
- 内置规则来自一个人的笔记库。如果不适合你的库，请在设置里打开**从空白开始**。

---
## 安装

**推荐 — 社区插件浏览器：**

1. 打开 **设置 → 第三方插件 → 浏览**
2. 搜索 **Rich Property** 并安装
3. 启用插件

**手动安装：** 将 `main.js`、`manifest.json`、`styles.css` 复制到 `<vault>/.obsidian/plugins/rich-property/`

最低 Obsidian 版本：**1.8.7**。目前仅支持桌面端。

---

## Agent 技能

仓库自带一个面向 AI 编程助手（如 [Claude Code](https://claude.ai/code)）的[技能](skills/obsidian-rich-property/SKILL.md)。安装后，助手可以为你的笔记库设计属性规则并装进去：有哪些字段、各自的合法取值和颜色、字段属于哪些笔记类型，以及联系多个属性的规则。

```bash
# 为你的所有项目安装 (-g)，装进 Claude Code
npx skills add SdKay/obsidian-rich-property -g -a claude-code

# 之后更新到新版本
npx skills update
```

去掉 `-g` 则只装进当前项目。手动安装：把 `skills/obsidian-rich-property` 文件夹复制到 `~/.claude/skills/`。

然后对 Claude 说：*"为我的笔记库配置 Rich Property，要有任务和缺陷两种笔记，它们的状态取值不同"*。

技能里带了一个小命令行工具 `scripts/rich-property.cjs`（纯 Node 18+，不需要 Obsidian）。它用插件自己的检查器检查规则文件并列出所有问题，所以它放行的文件，插件也放行。它会在保留旧文件副本之后，把规则装进笔记库的插件数据：

```bash
node scripts/rich-property.cjs validate rules.json
node scripts/rich-property.cjs install  rules.json "<笔记库路径>"
```

装完后在 Obsidian 里重新加载插件（关掉再打开）。

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

## 支持项目

Rich Property 以 AGPL-3.0 协议免费开源。如果这个插件改善了你的工作流程，欢迎自愿打赏，支持它的持续开发。每一份支持都有助于修复问题和增加新功能。

### 💳 PayPal
[![通过 PayPal 打赏](https://img.shields.io/badge/Donate-PayPal-003087?style=flat-square&logo=paypal&logoColor=white)](https://paypal.me/ssdking)

### 🧧 微信支付 / 支付宝

| 微信支付 | 支付宝 |
|:---:|:---:|
| <img src="docs/wechat-donate.jpg" width="120" alt="微信支付打赏二维码" /> | <img src="docs/alipay-donate.jpg" width="120" alt="支付宝打赏二维码" /> |

感谢你的支持！🙏

---

## 反馈

问题与功能建议：[GitHub Issues](https://github.com/SdKay/obsidian-rich-property/issues)

---

[![Star History Chart](https://api.star-history.com/svg?repos=SdKay/obsidian-rich-property&type=Date)](https://star-history.com/#SdKay/obsidian-rich-property&Date)

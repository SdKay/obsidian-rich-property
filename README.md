<div align="center">

<h1>Rich Property</h1>

<p>
  <b>🔽 Dropdown values &nbsp;·&nbsp; 🧭 Fields follow the note type &nbsp;·&nbsp; 🎨 Colored values &nbsp;·&nbsp; 🚩 Mistakes stand out &nbsp;·&nbsp; 🛠️ Your own rules</b>
</p>

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
  <a href="https://paypal.me/ssdking">
    <img src="https://img.shields.io/badge/Donate-PayPal-003087?style=flat-square&logo=paypal&logoColor=white" alt="Donate via PayPal" />
  </a>
</p>

<p>
  <a href="#what-it-does">Features</a> ·
  <a href="#settings">Settings</a> ·
  <a href="#installation">Install</a> ·
  <a href="#development">Development</a> ·
  <a href="README_CN.md">中文</a>
</p>

<p>
  <img src="docs/wechat-qrcode.jpg" alt="WeChat public account" width="120" />
  <br/><sub>Follow on WeChat for more Obsidian plugins &amp; tools</sub>
</p>

<table>
  <thead>
    <tr><th colspan="3">Other plugins I build</th></tr>
    <tr><th>Plugin</th><th>Description</th><th>Install page</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="https://github.com/SdKay/obsidian-rich-table"><b>Rich Table</b></a></td>
      <td>Spreadsheet-like tables in notes, plus an Excel viewer; searchable from Rich Search</td>
      <td><a href="obsidian://show-plugin?id=rich-table">Open in Obsidian</a></td>
    </tr>
    <tr>
      <td><a href="https://github.com/SdKay/obsidian-rich-view"><b>Rich View</b></a></td>
      <td>Show draw.io, Visio and PowerPoint right in your notes</td>
      <td><a href="obsidian://show-plugin?id=rich-view">Open in Obsidian</a></td>
    </tr>
    <tr>
      <td><a href="https://github.com/SdKay/obsidian-rich-search"><b>Rich Search</b></a></td>
      <td>Cross-file search with whole-word and regex matching, folder and file-type scope, across notes, PDF, Excel, PowerPoint, draw.io and Visio</td>
      <td><a href="obsidian://show-plugin?id=rich-search">Open in Obsidian</a></td>
    </tr>
  </tbody>
</table>

</div>

Edit note properties from dropdowns instead of free text. The fields offered follow the note type, values are colored, and anything outside your rules is flagged.

Obsidian's property panel lets you type any field and any value. This plugin puts your own rules on top of it: pick from the values you allow, see at a glance what breaks the rules, and keep the rules in one place.

---

## What it does

- **Dropdowns instead of typing.** Click a value (or press Enter on its row) to pick from the allowed values only. Works for single choices, yes/no, multiple choices and tags.
- **Fields follow the note type.** Set `type` and the fields that belong to it appear as one-click placeholders. The allowed values of a field can change with the type (for example `status` for a task and for a decision).
- **Mistakes stand out.** A value that is not allowed, a field that is not in your rules, or a field that does not belong to the note's type is marked across the whole row, with the reason on hover. Nothing is changed or deleted for you.
- **Colors and descriptions.** Each value can have a color (tinted or solid) and a short description shown in the menu.
- **Tags in groups.** The tag menu is grouped, and each group has its own values.
- **Folder-backed values.** A field such as `project` can list the folders under a path you choose.
- **Link fields with search.** Fields such as `related` open a note search, optionally limited to a folder.
- **Your own rules.** In the settings, add fields, change allowed values, add note types, and write rules that link properties ("when `author` is `agent`, `review` is available"). Export and import the rules as JSON.
- **Start from scratch.** A switch drops the built-in types and rules so you can build your own; what you built is kept when you switch back.
- **Six languages.** English, Chinese, Japanese, Korean, German and French, following Obsidian's language.

Properties that other plugins use (`cssclasses`, `aliases`, `banner`, `kanban-plugin` and so on) are never flagged or changed.

---

## Settings

- **Colored values and warnings.** Turns the colors, the red marks on mistakes and the placeholders on or off. Off restores Obsidian's own look.
- **Start from scratch.** Drops the built-in note types and rules so you can build your own. What you built is kept when you switch back.
- **Properties.** The list of fields. Add a field, change its type, description, allowed values (each with a color and a description) and the note types it applies to. Add a note type.
- **Rules.** Link properties together: "when `author` is `agent`, `review` is available", or "for type `solution`, `status` may only be `draft`, `stable` or `superseded`". Conditions are all-of or any-of.
- **Export, import, restore.** Copy the rules out as JSON, paste rules in, or go back to the built-in rules.

---

## Good to know

- **Editing rewrites the note's property block.** Obsidian saves the whole block when one value changes, which removes YAML comments and may change quoting and list style (`[a, b]` becomes a list). The note text is not touched. Do not use it on notes whose property comments matter.
- **It only guides the editing you do in Obsidian.** It does not stop another tool or an AI agent from writing a value that is not allowed to a file; it will mark it when you open the note.
- **Desktop only for now.**
- The built-in rules come from one person's vault. If they do not fit yours, turn on **Start from scratch** in the settings.

---
## Installation

**Community plugin browser (recommended):**

1. Open **Settings → Community plugins → Browse**
2. Search for **Rich Property** and install
3. Enable the plugin

**Manual:** copy `main.js`, `manifest.json`, `styles.css` to `<vault>/.obsidian/plugins/rich-property/`

Minimum Obsidian version: **1.8.7**. Desktop only for now.

---

## Agent Skill

A [skill](skills/obsidian-rich-property/SKILL.md) is included for AI coding agents such as [Claude Code](https://claude.ai/code). Once installed, an agent can design the property rules for your vault and install them: which fields exist, their allowed values and colors, which note types a field belongs to, and rules that link properties.

```bash
# install for all your projects (-g), into Claude Code
npx skills add SdKay/obsidian-rich-property -g -a claude-code

# later, to pick up newer versions
npx skills update
```

Omit `-g` to install into the current project only. To install by hand, copy the `skills/obsidian-rich-property` folder into `~/.claude/skills/`.

Then ask Claude: *"Set up Rich Property for my vault with task and bug notes, and a status that differs between them"*.

The skill bundles a small command-line tool, `scripts/rich-property.cjs` (plain Node 18+, no Obsidian needed). It checks a rules file with the same checker the plugin uses and lists every problem, so a file it accepts is a file the plugin accepts. It installs the rules into the vault's plugin data after keeping a copy of the old file:

```bash
node scripts/rich-property.cjs validate rules.json
node scripts/rich-property.cjs install  rules.json "<vault>"
```

Reload the plugin in Obsidian afterwards (switch it off and on).

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

## Support the Project

Rich Property is free and open-source under the AGPL-3.0 license. If this plugin has improved your workflow, you can support its ongoing development with a voluntary donation. Every contribution helps fix bugs and add new features.

### 💳 PayPal
[![Donate via PayPal](https://img.shields.io/badge/Donate-PayPal-003087?style=flat-square&logo=paypal&logoColor=white)](https://paypal.me/ssdking)

### 🧧 WeChat Pay / Alipay

| WeChat Pay | Alipay |
|:---:|:---:|
| <img src="docs/wechat-donate.jpg" width="120" alt="WeChat Pay donation QR code" /> | <img src="docs/alipay-donate.jpg" width="120" alt="Alipay donation QR code" /> |

Thank you for your support! 🙏

---

## Feedback

Issues and feature requests: [GitHub Issues](https://github.com/SdKay/obsidian-rich-property/issues)

---

[![Star History Chart](https://api.star-history.com/svg?repos=SdKay/obsidian-rich-property&type=Date)](https://star-history.com/#SdKay/obsidian-rich-property&Date)

# Hexo 项目模板

## package.json 示例

```json
{
  "name": "my-blog",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "hexo generate",
    "clean": "hexo clean",
    "deploy": "hexo deploy",
    "server": "hexo server"
  },
  "hexo": {
    "version": "7.2.0"
  },
  "dependencies": {
    "hexo": "^7.2.0",
    "hexo-generator-archive": "^2.0.0",
    "hexo-generator-category": "^2.0.0",
    "hexo-generator-index": "^3.0.0",
    "hexo-generator-tag": "^2.0.0",
    "hexo-renderer-ejs": "^2.0.0",
    "hexo-renderer-marked": "^6.3.0",
    "hexo-renderer-stylus": "^3.0.1",
    "hexo-server": "^3.0.0"
  }
}
```

## 常用插件

### RSS 订阅

```bash
npm install hexo-generator-feed
```

`_config.yml` 配置：

```yaml
feed:
  enable: true
  type: atom
  path: atom.xml
  limit: 20
  content_limit: 140
  order_by: -date
  autodiscovery: true
```

### 站内搜索

```bash
npm install hexo-generator-searchdb
```

`_config.yml` 配置：

```yaml
search:
  path: search.xml
  field: post
  content: true
  format: html
```

### 代码高亮

Hexo 7.x 内置支持 highlight.js 和 Prism.js：

```yaml
syntax_highlighter: highlight.js
highlight:
  line_number: true
  auto_detect: false
  tab_replace: ''
  wrap: true
  hljs: false
```

## 主题配置文件（覆盖式，推荐）

现代主题（NexT v8+、Butterfly 等）用**主题同名配置文件**覆盖主题默认值，**不要**直接改 `themes/<主题>/_config.yml`（主题升级时会被覆盖丢失）：

```
blog/
├── _config.yml              # 站点配置
├── _config.next.yml         # NexT 主题配置
├── _config.butterfly.yml    # Butterfly 主题配置
└── _config.icarus.yml       # Icarus 主题配置
```

切换主题只需修改 `_config.yml`：

```yaml
theme: next  # 或 butterfly, icarus 等
```

> 旧版 Next 曾用 `config/next/config.yml` 拆分结构，现已废弃，请勿照搬老教程。

## 文章模板 (scaffolds)

### post.md - 文章模板

```markdown
---
title: {{ title }}
date: {{ date }}
updated: {{ date }}
categories:
tags:
description:
keywords:
---
```

### draft.md - 草稿模板

```markdown
---
title: {{ title }}
date: {{ date }}
tags:
---
```

## 推荐目录结构

```
blog/
├── source/
│   ├── _posts/          # 文章
│   ├── _data/           # 数据文件（友链/菜单等）
│   │   ├── links.yml
│   │   └── menus.yml
│   ├── images/          # 图片
│   └── about/           # 关于页面
│       └── index.md
└── themes/
    ├── next/
    └── butterfly/
```

## 资源管理

### 文章资源文件夹

启用后每篇文章自动创建同名文件夹存放图片：

```yaml
post_asset_folder: true
marked:
  prependRoot: true
  postAsset: true
```

文章中引用图片：

```markdown
{% asset_img example.jpg 图片描述 %}
# 或
![图片描述](example.jpg)
```

### 全局图片

放在 `source/images/` 目录，引用方式：

```markdown
![](/images/screenshot.png)
```

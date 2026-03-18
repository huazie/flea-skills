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

## 主题配置文件

每个主题使用独立的配置文件 `_config.<theme>.yml`：

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

## 高级目录结构

```
blog/
├── config/                  # 高级配置目录
│   ├── next/               # NexT 主题详细配置
│   │   └── config.yml
│   └── butterfly/          # Butterfly 主题详细配置
│       └── config.yml
├── source/
│   ├── _posts/             # 文章
│   ├── _drafts/            # 草稿
│   ├── _data/              # 数据文件
│   │   ├── links.yml       # 友链数据
│   │   └── menus.yml       # 菜单配置
│   ├── images/             # 图片
│   └── about/              # 关于页面
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

# Hexo 站点配置详解

_config.yml 是 Hexo 的核心配置文件。

## 网站信息

```yaml
title: 我的博客          # 网站标题
subtitle: ''             # 网站副标题
description: ''          # 网站描述（用于SEO）
keywords:                # 网站关键词
author: John Doe         # 作者名字
language: zh-CN          # 网站语言
timezone: 'Asia/Shanghai' # 时区
```

## 网址设置

```yaml
url: https://yourusername.github.io  # 网站URL
root: /                              # 网站根目录
permalink: :year/:month/:day/:title/ # 文章永久链接格式
permalink_defaults:                  # 永久链接默认值
pretty_urls:
  trailing_index: true               # 是否保留 index.html
```

## 目录设置

```yaml
source_dir: source          # 资源文件夹
public_dir: public          # 公共文件夹（生成的静态文件）
tag_dir: tags               # 标签文件夹
archive_dir: archives       # 归档文件夹
category_dir: categories    # 分类文件夹
```

## 文章设置

```yaml
new_post_name: :title.md    # 新文章文件名格式
default_layout: post        # 默认布局
titlecase: false            # 标题转为标题格式
external_link:
  enable: true              # 外链在新标签打开
filename_case: 0            # 文件名大小写（0不改变，1小写，2大写）
render_drafts: false        # 是否渲染草稿
post_asset_folder: false    # 是否启用资源文件夹
relative_link: false        # 是否使用相对链接
future: true                # 是否显示未来文章
highlight:                  # 代码高亮设置
  enable: true
  line_number: true
  auto_detect: false
```

## 分类与标签

```yaml
default_category: uncategorized
category_map:              # 分类别名
tag_map:                   # 标签别名
```

## 部署配置（可选）

如果使用 `hexo deploy` 命令部署：

```yaml
deploy:
  type: git
  repo: https://github.com/username/username.github.io.git
  branch: main
```

> 注意：推荐使用 GitHub Actions 自动部署，无需配置此项。

## 主题配置

```yaml
theme: landscape    # 主题名称（对应 themes/ 目录下的文件夹名）
```

主题的详细配置在 `themes/<主题名>/_config.yml` 文件中。

## 常用主题推荐

| 主题 | 特点 |
|------|------|
| NexT | 简洁优雅，功能丰富 |
| Butterfly | 美观，支持多种特效 |
| Material | Material Design 风格 |
| Yelee | 简洁，适合技术博客 |

安装主题示例：

```bash
npm install hexo-theme-next
# 或
git clone https://github.com/next-theme/hexo-theme-next themes/next
```

## Front-matter 模板

文章顶部的 YAML 元数据：

```yaml
---
title: 文章标题
date: 2024-01-17 15:14:55
updated: 2024-01-17 15:14:55
categories:
  - [分类1, 子分类]
tags:
  - 标签1
  - 标签2
description: 文章摘要
keywords: 关键词1, 关键词2
top: 100          # 置顶优先级（部分主题支持）
cover: /images/cover.jpg  # 封面图片
---
```

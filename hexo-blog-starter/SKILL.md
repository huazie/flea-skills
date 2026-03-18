---
name: hexo-blog-starter
description: |
  Hexo + GitHub Pages 个人博客搭建助手。用于：
  (1) 从零开始搭建 Hexo 博客并部署到 GitHub Pages
  (2) 初始化 Hexo 项目、配置 GitHub Actions 自动部署
  (3) 解答 Hexo 建站、主题、部署相关问题
  触发词："搭建博客"、"创建个人博客"、"Hexo建站"、"GitHub Pages博客"、"帮我建个博客网站"
---

# Hexo 博客搭建指南

基于 GitHub Pages + Hexo 搭建个人博客的完整流程。

## 前置要求

确保系统已安装：

| 工具 | 版本要求 | 检查命令 |
|------|---------|---------|
| Node.js | 12.0+ | `node -v` |
| Git | 任意 | `git --version` |

未安装？参考 [references/prerequisites.md](references/prerequisites.md)。

## 快速搭建流程

### 1. 安装 Hexo CLI

```bash
npm install -g hexo-cli
```

### 2. 初始化博客项目

```bash
# 在指定目录初始化
hexo init <folder>
cd <folder>
npm install
```

### 3. 本地预览

```bash
hexo server
# 访问 http://localhost:4000
```

### 4. 部署到 GitHub Pages

#### 4.1 创建仓库

在 GitHub 创建名为 `<username>.github.io` 的仓库。

#### 4.2 配置 GitHub Actions 自动部署

创建 `.github/workflows/pages.yml`：

**基础版（适合快速上手）：**

```yaml
name: Build And Deploy

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          submodules: recursive
      - name: Use Node.js 20.x
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Cache NPM dependencies
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.OS }}-npm-cache
          restore-keys: |
            ${{ runner.OS }}-npm-cache
      - name: Install Dependencies
        run: npm install
      - name: Clean
        run: npm run clean
      - name: Build
        run: npm run build
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public
  deploy:
    needs: build
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

> 💡 **进阶配置**：多主题支持、外部仓库主题、游戏模块等，参见 [references/github-actions-advanced.md](references/github-actions-advanced.md)

#### 4.3 启用 GitHub Pages

仓库 Settings → Pages → Source → 选择 **GitHub Actions**

#### 4.4 推送代码

```bash
git add .
git commit -m "Initial blog setup"
git push origin main
```

部署完成后访问 `https://<username>.github.io/`

## 项目结构

```
blog/
├── _config.yml              # 站点主配置
├── _config.<theme>.yml      # 主题配置（每个主题一个）
├── package.json             # 依赖信息
├── scaffolds/               # 文章模板
├── source/                  # 资源文件
│   ├── _posts/              # 博客文章 (Markdown)
│   ├── _data/               # 数据文件
│   └── images/              # 图片资源
├── themes/                  # 主题文件夹
├── config/                  # 高级配置目录（可选）
│   └── <theme>/             # 各主题独立配置
└── .github/
    └── workflows/
        └── pages.yml        # GitHub Actions 部署
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `hexo new "标题"` | 新建文章 |
| `hexo new page "页面名"` | 新建页面 |
| `hexo generate` | 生成静态文件 |
| `hexo server` | 本地预览 |
| `hexo clean` | 清除缓存 |
| `hexo deploy` | 部署（需配置） |

**package.json scripts 示例：**

```json
{
  "scripts": {
    "build": "hexo generate",
    "clean": "hexo clean",
    "deploy": "hexo deploy",
    "server": "hexo server"
  }
}
```

## 详细参考

- [前置环境安装指南](references/prerequisites.md) - Node.js、Git 安装配置
- [Hexo 配置详解](references/hexo-config.md) - 站点配置说明
- [GitHub Actions 进阶配置](references/github-actions-advanced.md) - 多主题、外部模块、构建优化
- [项目模板与插件](references/project-template.md) - package.json、常用插件、主题配置

## 参考链接

- [Hexo 官方文档](https://hexo.io/zh-cn/docs/)
- [GitHub Pages 快速入门](https://docs.github.com/zh/pages/quickstart)
- [GitHub Actions 文档](https://docs.github.com/zh/actions)

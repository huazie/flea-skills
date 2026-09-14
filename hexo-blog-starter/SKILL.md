---
name: hexo-blog-starter
description: |
  Hexo + GitHub/GitLab Pages 个人博客搭建助手（面向零基础用户）。用于：
  (1) 从零开始搭建 Hexo 博客并部署到 GitHub Pages 或 GitLab Pages
  (2) 初始化 Hexo 项目、配置 GitHub Actions / GitLab CI 自动部署
  (3) 解答 Hexo 建站、主题、部署相关问题
  触发词："搭建博客"、"创建个人博客"、"Hexo建站"、"GitHub Pages博客"、"GitLab Pages博客"、"帮我建个博客网站"
---

# Hexo 博客搭建指南

基于 GitHub Pages / GitLab Pages + Hexo 搭建个人博客的完整流程。**面向零基础用户**：本技能所有命令都由 agent 直接执行，你只需按提示确认路径、提供用户名等信息，无需自己敲命令。

## 前置要求

| 工具 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | **18 LTS 或 20 LTS（推荐）** | Hexo 7 不支持 Node 12，旧教程的 `12.0+` 已过时 |
| Git | 任意较新版本 | 用于版本管理与推送 |

- 没装？参考 [references/prerequisites.md](references/prerequisites.md)（含 nvm 安装、国内镜像）。
- **推荐用 nvm 安装 Node**，避免全局安装污染 PATH（新手最容易卡在 `hexo 不是命令`）。

## 工作流程总览

```
1. 环境自检与平台判断（agent 检测 OS：Windows/macOS/Linux，据此选路径与命令）
2. 询问必填项（项目位置 / 部署平台 / 用户名）
3. 询问可选项（标题 / 作者 / 主题 / Node 版本，回车用默认）
4. 初始化项目（hexo init + npm install + 本地预览验证）
5. 如需部署：账号准备 → 认证配置 → 写 Actions/CI → 指导推送
```

> 💡 **所有命令由 agent 在后台执行**，遇到报错自动按 [references/troubleshooting.md](references/troubleshooting.md) 排查，你不用自己处理终端。

## 0. 环境自检与平台判断（由 agent 执行）

**第一步：判断当前操作系统**，后续路径与命令按系统自动选择（agent 自动检测，无需询问用户）：

| 系统 | 默认项目路径 | 路径风格 | 剪贴板命令 | 安装 Node 推荐 |
|------|------------|---------|-----------|---------------|
| **Windows** | `C:\Users\<用户名>\blog` | `\`（Git Bash 里写 `/c/...`） | `clip` | nvm-windows |
| **macOS** | `~/blog` | `/` | `pbcopy` | nvm |
| **Linux** | `~/blog` | `/` | `xclip -sel clip` | nvm |

> 检测方式：路径以 `C:\` 开头或存在 `%USERPROFILE%` → Windows；`uname` 返回 `Darwin` → macOS、`Linux` → Linux。

**第二步：检测环境**：

```bash
node -v        # 应为 18.x / 20.x，否则引导安装
npm -v         # 应存在
git --version  # 应存在
```

- 三者齐全 → 直接进入下一步。
- 缺失 Node/Git → 按 [references/prerequisites.md](references/prerequisites.md) 引导安装（按系统选 nvm / nvm-windows），**不要假设用户已具备**。
- 若 `hexo` 命令不在 PATH → 用全局 bin 绝对路径执行，或重装 hexo-cli。

## 1. 确定博客项目位置

**询问用户：**
> 你想在哪里创建 Hexo 博客项目？
> - 按回车使用当前系统默认位置：**Windows** `C:\Users\<用户名>\blog` / **macOS、Linux** `~/blog`
> - 或输入自定义路径，如：`E:\projects\my-blog`

**规则：**
- 后续步骤都基于此路径执行。
- ⚠️ **`hexo init` 要求目标目录为空**。若目录已存在且非空，agent 会在其下新建子目录（如 `my-blog/`）再初始化，**不覆盖你已有文件**。

## 2. 安装 Hexo CLI（agent 执行）

```bash
npm install -g hexo-cli
```

- 国内网络慢：先 `npm config set registry https://registry.npmmirror.com`（见 prerequisites.md）。
- 装完验证 `hexo -v`。

## 3. 初始化博客项目（agent 执行）

```bash
hexo init <项目路径>
cd <项目路径>
npm install
```

> `hexo init` 会克隆官方 starter 并安装依赖，生成标准 Hexo 结构（见文末「项目结构」）。

## 4. 本地预览（agent 执行）

```bash
hexo server   # 默认 http://localhost:4000
```

agent 会在后台启动并把预览地址给你。**改文章/配置会自动热重载。**

## 5. 部署到 GitHub Pages 或 GitLab Pages

**询问用户：**
> 你想部署到哪个平台？
> - `github` - GitHub Pages（默认，推荐）
> - `gitlab` - GitLab Pages

---

#### 方案 A：GitHub Pages 部署

> ⚠️ **部署前置（新手必读）**：你必须有 GitHub 账号、建对仓库、配好认证，否则推送会卡住。
> 完整傻瓜步骤见 [references/github-auth.md](references/github-auth.md)（注册账号 / 建 `<username>.github.io` 仓库 / 配 SSH 或 PAT）。

#### 4.1 创建仓库

在 GitHub 创建名为 `<username>.github.io` 的 **Public** 仓库（用户名全小写，拼写严格一致）。

#### 4.2 配置 GitHub Actions 自动部署

创建 `.github/workflows/pages.yml`：

**基础版（适合快速上手）：**

```yaml
name: Build And Deploy

on:
  push:
    branches:
      - main
  workflow_dispatch:  # 允许在 Actions 页面手动触发

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
          key: ${{ runner.OS }}-npm-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            ${{ runner.OS }}-npm-
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

> 💡 **进阶配置**（多主题、外部模块、构建优化）：参见 [references/github-actions-advanced.md](references/github-actions-advanced.md)

#### 4.3 启用 GitHub Pages

仓库 **Settings → Pages → Source → 选择 GitHub Actions**。

#### 4.4 推送代码

```bash
git init
git add .
git commit -m "Initial blog setup"
# 远程地址二选一（与你的认证方式保持一致）：
git remote add origin git@github.com:<username>/<username>.github.io.git            # SSH 方式
# git remote add origin https://github.com/<username>/<username>.github.io.git      # HTTPS + PAT 方式
git branch -M main
git push -u origin main
```

> 认证失败？见 [references/github-auth.md](references/github-auth.md) 与 [references/troubleshooting.md](references/troubleshooting.md)。

#### 4.5 部署后查看与排错

- 进仓库 **Actions** 标签页，看构建是否跑绿（红色 = 失败，点开看日志）。
- **首次生效需等 1–10 分钟**，之后通常几十秒；浏览器硬刷新（Ctrl+F5）。
- 404 / 样式乱 / 没更新？见 [references/troubleshooting.md](references/troubleshooting.md)「部署后页面类」。

部署完成后访问 `https://<username>.github.io/`

---

#### 方案 B：GitLab Pages 部署

> 可选/进阶：多数新手用 GitHub Pages 即可。GitLab 步骤见 [references/gitlab-pages.md](references/gitlab-pages.md)。

##### B.1 创建仓库

在 GitLab 创建名为 `<username>.gitlab.io` 的仓库。

##### B.2 配置 .gitlab-ci.yml

在项目根目录创建 `.gitlab-ci.yml`：

```yaml
image: node:20-alpine
cache:
  paths:
    - node_modules/

before_script:
  - npm install hexo-cli -g
  - npm install

pages:
  script:
    - npm run build
  artifacts:
    paths:
      - public
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

##### B.3 配置 _config.yml

```yaml
url: https://<username>.gitlab.io
root: /
```

##### B.4 推送代码

```bash
git add .
git commit -m "Initial blog setup"
git push origin main
```

##### B.5 启用共享 Runner

GitLab 项目 **Settings → CI/CD → Runners → 启用 shared runners**

部署完成后访问 `https://<username>.gitlab.io/`

---

## 交互式配置流程

在帮助用户搭建博客时，按以下顺序询问关键信息：

### 必问项目

| 序号 | 问题 | 说明 |
|------|------|------|
| 1 | **博客项目位置** | 默认 `~/blog`，或用户指定路径 |
| 2 | **部署平台** | GitHub Pages 或 GitLab Pages |
| 3 | **用户名** | 对应平台的用户名，用于创建仓库（GitHub 需全小写） |

### 可选项目（用户未提及则使用默认值）

| 问题 | 默认值 | 说明 |
|------|--------|------|
| 博客标题 | `My Blog` | `_config.yml` 中的 `title` |
| 作者名称 | 系统用户名 | `_config.yml` 中的 `author` |
| 主题选择 | `landscape` | 可选：next, butterfly, icarus 等 |
| Node.js 版本 | `20` | GitHub Actions 中的版本 |

### 路径处理规则

- 相对路径 → 转为绝对路径（如 `my-blog` → `C:\Users\xxx\my-blog`）
- 环境变量 → 展开（`%USERPROFILE%\blog` → `C:\Users\xxx\blog`）
- 目录已存在且非空 → 询问覆盖 / 换路径 / 建子目录继续
- 路径含空格 → 提示改用无空格路径（如 `C:\my-blog`）

## 项目结构

```
blog/
├── _config.yml              # 站点主配置（新手只需改 title/author/url/language）
├── _config.<theme>.yml      # 主题配置（每个主题一个）
├── package.json             # 依赖信息
├── scaffolds/               # 文章模板
├── source/
│   └── _posts/              # 博客文章 (Markdown)
├── themes/                  # 主题文件夹
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

## 搭建完成后：下一步

博客上线后，常见后续操作：

| 想做什么 | 怎么做 |
|---------|--------|
| 写第一篇文章 | agent 执行 `hexo new "我的第一篇文章"`，再编辑 `source/_posts/` 下新文件（顶部 front-matter 填 `title`/`tags`/`categories`），保存即预览 |
| 本地预览 | `hexo server`（http://localhost:4000），改文件自动热重载 |
| 发布上线 | `git add . && git commit -m "post: xxx" && git push`，Actions 自动构建发布（等 1–10 分钟） |
| 换主题 | 只推 **NexT / Butterfly**；改 `_config.yml` 的 `theme`，再补 `_config.<theme>.yml`（见 project-template.md） |
| 绑定自己的域名 | 见 github-actions-advanced.md「绑定自定义域名（CNAME）」 |

## 详细参考

- [前置环境安装指南](references/prerequisites.md) - Node.js（nvm）、Git 安装配置、国内镜像
- [GitHub 账号注册与认证](references/github-auth.md) - 注册账号、建仓库、SSH/PAT 配置（**部署前必看**）
- [常见报错速查表](references/troubleshooting.md) - 安装/初始化/推送/部署后问题排查（**出问题先看这**）
- [Hexo 配置详解](references/hexo-config.md) - 站点配置（必改/可选分层）
- [GitHub Actions 进阶配置](references/github-actions-advanced.md) - 多主题、外部模块、构建优化
- [GitLab Pages 部署指南](references/gitlab-pages.md) - GitLab CI/CD 配置、自定义域名（可选/进阶）
- [项目模板与插件](references/project-template.md) - package.json、常用插件、主题配置

## 参考链接

- [Hexo 官方文档](https://hexo.io/zh-cn/docs/)
- [GitHub Pages 快速入门](https://docs.github.com/zh/pages/quickstart)
- [GitHub Actions 文档](https://docs.github.com/zh/actions)

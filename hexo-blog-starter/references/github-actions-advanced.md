# GitHub Actions 进阶配置

## 多主题支持

在构建时检出多个主题，支持博客切换不同主题：

```yaml
- name: Checkout Theme Next
  uses: actions/checkout@v4
  with:
    repository: next-theme/hexo-theme-next
    path: themes/next

- name: Checkout Theme Butterfly
  uses: actions/checkout@v4
  with:
    repository: jerryc127/hexo-theme-butterfly
    path: themes/butterfly
```

### 常用主题仓库

| 主题 | 仓库地址 |
|------|---------|
| NexT | `next-theme/hexo-theme-next` |
| Butterfly | `jerryc127/hexo-theme-butterfly` |
| Light | `hexojs/hexo-theme-light` |
| Matery | `blinkfox/hexo-theme-matery` |

## 完整进阶配置示例

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
      # 检出主仓库
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          submodules: recursive

      # 检出多个主题
      - name: Checkout Theme Next
        uses: actions/checkout@v4
        with:
          repository: next-theme/hexo-theme-next
          path: themes/next

      - name: Checkout Theme Butterfly
        uses: actions/checkout@v4
        with:
          repository: jerryc127/hexo-theme-butterfly
          path: themes/butterfly

      # Node.js 环境
      - name: Use Node.js 20.x
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      # 缓存依赖
      - name: Cache NPM dependencies
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.OS }}-npm-cache
          restore-keys: |
            ${{ runner.OS }}-npm-cache

      # 构建流程
      - name: Install Dependencies
        run: npm install

      - name: Clean
        run: npm run clean

      - name: Build
        run: npm run build

      # 上传构建产物
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

## 添加外部模块

### 游戏模块示例

```yaml
- name: Clean existing game directory
  run: rm -rf public/game

- name: Checkout Game
  uses: actions/checkout@v4
  with:
    repository: username/game-repo
    path: public/game
```

### 子模块处理

如果博客使用 Git 子模块管理主题：

```yaml
- uses: actions/checkout@v4
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
    submodules: recursive  # 递归检出子模块
```

## 构建优化

### 添加 Clean 步骤

在构建前清理缓存，避免旧文件残留：

```yaml
- name: Clean
  run: npm run clean
```

需要确保 `package.json` 中有：

```json
{
  "scripts": {
    "clean": "hexo clean"
  }
}
```

### 缓存优化

使用更精确的缓存 key：

```yaml
- name: Cache NPM dependencies
  uses: actions/cache@v4
  with:
    path: node_modules
    key: ${{ runner.OS }}-npm-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      ${{ runner.OS }}-npm-
```

## 触发条件扩展

### 手动触发部署

```yaml
on:
  push:
    branches:
      - main
  workflow_dispatch:  # 允许手动触发
```

### 定时重建

每周自动重建一次（处理外部依赖更新）：

```yaml
on:
  push:
    branches:
      - main
  schedule:
    - cron: '0 0 * * 0'  # 每周日 00:00 UTC
```

## 常见问题

### 主题检出后需要安装依赖？

部分主题需要独立安装依赖：

```yaml
- name: Install Theme Dependencies
  run: |
    cd themes/next
    npm install
```

### 私有仓库主题？

需要配置 Personal Access Token：

```yaml
- name: Checkout Private Theme
  uses: actions/checkout@v4
  with:
    repository: username/private-theme
    token: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
    path: themes/private
```

需要在仓库 Settings → Secrets 中添加 `PERSONAL_ACCESS_TOKEN`。

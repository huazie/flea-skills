# GitLab Pages 部署指南

## GitLab Pages vs GitHub Pages 对比

| 特性 | GitHub Pages | GitLab Pages |
|------|-------------|--------------|
| 仓库域名 | `<username>.github.io` | `<username>.gitlab.io` |
| CI/CD 配置 | `.github/workflows/*.yml` | `.gitlab-ci.yml` |
| 私有仓库 | 需要付费 | 支持私有仓库部署 |
| 自定义域名 | 支持 | 支持 |
| 自动 HTTPS | 支持 | 支持（Let's Encrypt） |

## 部署配置

### 1. 用户页面（User Page）

仓库名格式：`<username>.gitlab.io`

```
https://<username>.gitlab.io
```

配置文件：

```yaml
# _config.yml
url: https://<username>.gitlab.io
root: /
```

### 2. 项目页面（Project Page）

仓库名格式：`<任意名称>`（如 `blog`、`hexo-site`）

```
https://<username>.gitlab.io/<project-name>
```

配置文件：

```yaml
# _config.yml
url: https://<username>.gitlab.io/blog
root: /blog
```

> ⚠️ 注意：GitLab 项目页面需要将网站放在 `public/` 子目录

### .gitlab-ci.yml 完整配置

```yaml
image: node:20-alpine

stages:
  - build
  - deploy

cache:
  paths:
    - node_modules/

before_script:
  - npm install hexo-cli -g
  - npm install

build:
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - public
    expire_in: 1 week

pages:
  stage: deploy
  script:
    - npm run build
  artifacts:
    paths:
      - public
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
  dependencies:
    - build
```

## 常用 Node.js 版本

| Node.js 版本 | image 标签 |
|-------------|------------|
| Node.js 20 | `node:20-alpine` |
| Node.js 18 | `node:18-alpine` |
| Node.js 16 | `node:16-alpine` |

> 📌 使用 `node:XX-alpine` 镜像可以加速构建

## 多主题支持

```yaml
image: node:20-alpine

before_script:
  - npm install hexo-cli -g
  - npm install

pages:
  script:
    - npm install hexo-theme-next
    - npm run build
  artifacts:
    paths:
      - public
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

## 缓存优化

```yaml
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .npm/
```

## 手动触发部署

```yaml
workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "web"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

在 GitLab Web 界面：CI/CD → Run Pipeline → Run Pipeline

## 自定义域名

### 添加域名

1. 项目 Settings → Pages
2. New Domain 添加自定义域名
3. 按照提示添加 DNS 记录

### DNS 配置

| 类型 | 名称 | 值 |
|------|------|-----|
| CNAME | blog | `<username>.gitlab.io` |
| TXT | gitlab-verification | GitLab 提供的验证码 |

### 强制 HTTPS

GitLab Pages 默认启用 HTTPS，启用自定义域名后会自动获取 Let's Encrypt 证书。

## 常见问题

### 构建失败：node_modules 未找到

确保 `.gitignore` 包含：

```
node_modules/
public/
.db.json/
.deploy_git/
```

### 构建时间过长

使用 Alpine 镜像减少基础镜像大小：

```yaml
# 从 node:20 改为 node:20-alpine
image: node:20-alpine
```

### 部署后页面 404

检查：
1. `_config.yml` 中 `url` 和 `root` 配置是否正确
2. `.gitlab-ci.yml` 中 `artifacts.paths` 是否为 `public`

### 私有仓库部署

GitLab Pages 支持私有仓库部署，无需额外配置。

## 参考链接

- [GitLab Pages 官方文档](https://docs.gitlab.com/ee/user/project/pages/)
- [GitLab CI YAML 配置](https://docs.gitlab.com/ee/ci/yaml/)
- [Hexo 官方 GitLab Pages 指南](https://hexo.io/zh-cn/docs/gitlab-pages)

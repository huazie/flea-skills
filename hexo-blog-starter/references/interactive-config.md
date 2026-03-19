# 交互式配置指南

## 配置流程图

```
开始搭建
    │
    ▼
┌─────────────────┐
│ 1. 询问项目位置  │ ◄── 必须：决定后续所有操作路径
│    (默认~/blog)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. 询问GitHub   │ ◄── 必须：用于仓库名和部署配置
│    用户名       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. 检查环境     │ ◄── Node.js + Git
│    (自动检测)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. 可选配置     │ ◄── 博客标题、作者、主题等
│    (使用默认值)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. 执行搭建     │ ◄── 初始化项目、配置GitHub Actions
│    (自动执行)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. 指导用户操作  │ ◄── 创建仓库、推送代码
│    (GitHub设置)  │
└─────────────────┘
```

## 询问话术模板

### 开场白

> 我来帮你搭建一个基于 Hexo + GitHub Pages 的个人博客 🚀
>
> 需要确认几个信息，按提示回复即可：

### 1. 项目位置询问

> **📁 博客项目位置**
>
> 你想在哪里创建博客项目？
> - 直接按回车使用默认：`C:\Users\<用户名>\blog`（Windows）或 `~/blog`（Mac/Linux）
> - 或输入自定义路径，如：`D:\projects\my-blog`

### 2. 部署平台询问

> **🚀 部署平台**
>
> 你想部署到哪个平台？
> - `github` - GitHub Pages（默认，推荐）
> - `gitlab` - GitLab Pages（支持私有仓库）
>
> 直接按回车使用 GitHub Pages

### 3. 用户名询问

> **👤 用户名**
>
> 你的 GitHub/GitLab 用户名是什么？
> - 用于创建 `<username>.github.io` 或 `<username>.gitlab.io` 仓库
> - 博客部署后将通过 `https://<username>.github.io` 或 `https://<username>.gitlab.io` 访问

### 3. 可选配置询问

> **⚙️ 可选配置**（按回车使用默认值）
>
> | 配置项 | 默认值 | 你的输入 |
> |--------|--------|----------|
> | 博客标题 | My Blog | |
> | 作者名称 | <系统用户名> | |
> | 选择主题 | landscape | next / butterfly / icarus / landscape |

## 路径处理规则

### 默认路径

| 系统 | 默认路径 |
|------|----------|
| Windows | `C:\Users\<用户名>\blog` |
| macOS | `~/blog` |
| Linux | `~/blog` |

### 路径规范化

用户输入路径时，需要处理：

1. **相对路径** → 转为绝对路径
   - 输入：`my-blog` → 转为 `C:\Users\xxx\my-blog`
   
2. **环境变量** → 展开
   - 输入：`%USERPROFILE%\blog` → 转为 `C:\Users\xxx\blog`
   - 输入：`$HOME/blog` → 转为 `/home/xxx/blog`

3. **路径存在检查**
   - 目录已存在且非空 → 询问是否覆盖或换路径
   - 父目录不存在 → 询问是否自动创建

## 配置收集后的执行流程

收集完用户输入后，按以下步骤执行：

```javascript
// 伪代码示例
const config = {
  projectPath: 'C:\\Users\\xxx\\blog',  // 用户指定或默认
  githubUsername: 'username',            // 用户提供
  title: 'My Blog',                      // 默认或用户指定
  author: 'Author Name',                 // 默认或用户指定
  theme: 'landscape',                    // 默认或用户指定
  nodeVersion: '20'                      // 默认
};

// 执行步骤：
// 1. 检查/安装 Node.js 和 Git
// 2. 安装 hexo-cli
// 3. hexo init <projectPath>
// 4. 修改 _config.yml（title, author, url）
// 5. 创建 .github/workflows/pages.yml
// 6. 创建 package.json scripts
// 7. 初始化 git 仓库
// 8. 指导用户创建 GitHub 仓库并推送
```

## 常见路径问题处理

### 问题1：目录已存在

```
⚠️ 目录 C:\Users\xxx\blog 已存在！

请选择：
1. 覆盖（删除后重新创建）
2. 换其他路径
3. 在该目录继续（如果已是 Hexo 项目）
```

### 问题2：路径包含空格或特殊字符

```
⚠️ 路径包含空格，可能导致某些工具问题。

建议改为：
- 原路径：C:\My Documents\My Blog
- 建议：C:\blog 或 C:\my-blog

是否继续？（y/n）
```

### 问题3：磁盘空间不足

```
⚠️ 目标磁盘剩余空间不足 1GB

Hexo 项目需要约 200MB 空间，建议预留更多。
是否继续？（y/n）
```

## 配置持久化

将用户配置保存到项目目录，方便后续使用：

```yaml
# .hexo-config.yml（项目根目录）
# 由 Skill 自动生成，记录用户初始配置

project:
  created_at: 2024-01-17
  created_by: hexo-blog-starter skill

user:
  github_username: username
  preferred_theme: next

paths:
  project: C:\Users\xxx\blog
  source: source
  themes: themes
```

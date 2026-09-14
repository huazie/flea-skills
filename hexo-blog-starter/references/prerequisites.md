# 前置环境安装指南

## Node.js 安装

### 推荐：用 nvm 安装（避免污染 PATH，新手最稳）

- **Windows**：下载 [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) 安装，然后：
  ```bash
  nvm install 20
  nvm use 20
  ```
- **macOS / Linux**：
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  nvm install 20
  nvm use 20
  ```

### 备选：直接下载安装包

1. 访问 [Node.js 官方下载页面](https://nodejs.org/en/download/)
2. 选择 LTS 版本下载（推荐 20.x 或更高）
3. Windows 用户下载 `.msi` 安装包，双击安装

> ⚠️ 装完**重开终端**再执行 `node -v`；若仍提示找不到命令，说明 PATH 没刷新，重启电脑或手动把 Node 目录加入 PATH。

### 环境变量配置（Windows）

1. 右击 Windows 图标 → 系统
2. 高级系统设置 → 环境变量
3. 编辑 `Path` 变量，添加 Node.js 安装目录

### 验证安装

```bash
node -v    # 查看 Node.js 版本
npm -v     # 查看 npm 版本
```

### 更新 npm（可选）

```bash
npm install -g npm           # 更新到最新版本
npm install -g npm@<version> # 更新到指定版本
```

---

## Git 安装

### 下载安装

1. 访问 [Git 下载页面](https://git-scm.com/download/win)
2. 下载对应系统的安装包
3. 双击安装，使用默认选项即可

### 环境变量配置（Windows）

将 Git 的 `bin` 或 `cmd` 目录添加到 `Path` 环境变量。

例如：`C:\Program Files\Git\cmd`

### 验证安装

```bash
git --version
```

### Git 基础配置

```bash
git config --global user.name "你的用户名"
git config --global user.email "你的邮箱"
```

---

## 常见问题

### npm 下载缓慢？

使用国内镜像：

```bash
# 临时使用
npm install -g hexo-cli --registry=https://registry.npmmirror.com

# 永久设置
npm config set registry https://registry.npmmirror.com
```

### 权限问题？

Windows 用户：
- 以管理员身份运行命令提示符或 PowerShell

macOS/Linux 用户：
- 使用 `sudo npm install -g hexo-cli`

# 前置环境安装指南

> 本技能会**自动判断你的操作系统**（Windows / macOS / Linux），下面按系统选用对应步骤即可。

## Node.js 安装

### 推荐：用 nvm 安装（避免污染 PATH，新手最稳）

| 系统 | 安装方式 |
|------|---------|
| **Windows** | 下载 [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) 安装包，双击安装 |
| **macOS / Linux** | `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh \| bash` |

装好后（全平台命令一致）：

```bash
nvm install 20
nvm use 20
```

### 备选：直接下载安装包

1. 访问 [Node.js 官方下载页面](https://nodejs.org/en/download/)
2. 选择 LTS 版本下载（推荐 20.x）
3. 按系统安装：
   - **Windows**：下载 `.msi`，双击安装
   - **macOS**：下载 `.pkg` 双击安装（或 `brew install node@20`）
   - **Linux**：用包管理器（如 `apt install nodejs npm`）或下载 tar 包

> ⚠️ 装完**重开终端**再执行 `node -v`；若仍提示找不到命令，说明 PATH 没刷新，重启电脑或手动把 Node 目录加入 PATH。

### 环境变量配置（若提示找不到 node/npm）

**Windows**：
1. 右击 Windows 图标 → 系统 → 高级系统设置 → 环境变量
2. 编辑 `Path` 变量，添加 Node.js 安装目录（如 `C:\Program Files\nodejs\`）

**macOS / Linux**：nvm 会自动写入 `~/.bashrc` / `~/.zshrc`；手动安装则把 Node 的 `bin` 加入配置并重载：

```bash
export PATH="$HOME/node/bin:$PATH"
source ~/.zshrc   # 或 ~/.bashrc，或直接重开终端
```

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

### 下载安装（按系统）

| 系统 | 安装方式 |
|------|---------|
| **Windows** | 下载 [Git for Windows](https://git-scm.com/download/win)，双击安装，全部用默认选项 |
| **macOS** | `brew install git`，或下载 [官方安装包](https://git-scm.com/download/mac) |
| **Linux** | `sudo apt install git`（Debian/Ubuntu）或 `sudo dnf install git`（Fedora） |

官网（自动识别系统）：https://git-scm.com/downloads

### 环境变量配置（若提示找不到 git）

- **Windows**：把 Git 的 `cmd` 目录加入 `Path`，例如 `C:\Program Files\Git\cmd`。
- **macOS / Linux**：包管理器装好通常已自动配置；手动安装则把 Git 的 `bin` 目录加入 PATH。

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

- **Windows**：以管理员身份运行 PowerShell。
- **macOS / Linux**：**不要**用 `sudo npm`（会污染全局权限）；改用 nvm 安装 Node 即可规避。

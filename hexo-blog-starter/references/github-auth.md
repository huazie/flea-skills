# GitHub 账号注册与认证（小白必看）

本技能默认你要把博客部署到 GitHub Pages。下面是从「零账号」到「能推送代码」的完整傻瓜步骤。**这些命令由 agent 直接执行，你只需按提示确认/输入信息即可。**

## 1. 注册 GitHub 账号

1. 打开 https://github.com ，点 **Sign up**（右上角）。
2. 填用户名、邮箱、密码 → 验证邮箱 → 完成注册。
3. **记住你的用户名（username）**，下面所有 `<username>` 都替换成它。

> ⚠️ 用户名只能含字母、数字、`-`，且**全小写**（GitHub Pages 地址大小写敏感）。

## 2. 创建博客仓库

1. 登录后点右上角 **+** → **New repository**。
2. **Repository name 必须填**：`<username>.github.io`
   - 例如用户名为 `huazie`，仓库名就填 `huazie.github.io`
   - 这是 GitHub **用户页**的固定格式，填错会导致 404
3. **Visibility 选 Public**（私有仓库的用户页不支持 GitHub Pages 免费版）。
4. 不要勾选 "Add a README"（保持空仓库，后面由本地推送）。
5. 点 **Create repository**。

## 3. 配置 Git 身份认证（最重要的一步）

GitHub 自 2021 年起**禁止用账号密码推送**，必须用 **SSH 密钥** 或 **Personal Access Token (PAT)**。二选一：

### 方式 A：SSH 密钥（推荐，一次配置永久免密）

agent 会执行：

```bash
# 生成密钥（一路回车，不设置密码短语）
ssh-keygen -t ed25519 -C "你的邮箱"

# 复制公钥内容到剪贴板（按系统选一条执行）
clip < ~/.ssh/id_ed25519.pub            # Windows
pbcopy < ~/.ssh/id_ed25519.pub          # macOS
xclip -sel clip < ~/.ssh/id_ed25519.pub # Linux（需先装 xclip）
```

然后：
1. 打开 GitHub → 右上角头像 → **Settings** → **SSH and GPG keys** → **New SSH key**。
2. Title 随便填（如 `my-laptop`），Key 粘贴刚才复制的内容 → **Add SSH key**。

验证：

```bash
ssh -T git@github.com
# 看到 "Hi <username>! You've successfully authenticated" 即成功
```

> 注意：用 SSH 后，仓库远程地址要用 **SSH 格式**：
> `git@github.com:<username>/<username>.github.io.git`
> （不是 `https://...`）

### 方式 B：Personal Access Token（PAT，适合不想配 SSH）

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**。
2. Note 填 `blog-deploy`，**Expiration** 选 `No expiration`（或按需）。
3. 勾选 **repo**（完整仓库权限）。
4. 点 **Generate token**，**立即复制 token**（只显示一次！）。
5. 推送时若提示输入密码，**粘贴这个 token**（不是 GitHub 登录密码）。

> 为避免每次输 token，可让 agent 配置 Git credential helper 缓存：
> `git config --global credential.helper store`

## 4. 首次推送

仓库建好后，agent 会执行：

```bash
git remote add origin git@github.com:<username>/<username>.github.io.git
git branch -M main
git add .
git commit -m "Initial blog setup"
git push -u origin main
```

推送成功后，博客并不会立刻出现，见 [troubleshooting.md](troubleshooting.md) 的「部署后没生效」一节。

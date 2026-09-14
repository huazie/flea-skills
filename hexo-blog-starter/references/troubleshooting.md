# 常见报错速查表（小白排错）

部署博客时绝大多数问题都在这张表里。按报错信息对号入座。

## 一、安装 / 环境类

### `npm ERR! code EACCES` 或 `permission denied`
**原因**：全局安装没权限（多见于 macOS/Linux 直接 `npm install -g`）。
**解决**：不要 `sudo npm`，改用 **nvm** 安装 Node（见 prerequisites.md），或 Windows 下用管理员 PowerShell。

### `hexo : 无法将“hexo”识别为 cmdlet / command not found: hexo`
**原因**：`hexo-cli` 没装好，或装了但 PATH 没包含全局 bin。
**解决**：
- 确认 `npm install -g hexo-cli` 成功；
- 查全局 bin：`npm bin -g`（旧版）或 `npm root -g`；
- 把该目录加入 PATH，或重启终端后再试。

### `node -v` 报命令找不到
**原因**：Node 没装或 PATH 未生效。
**解决**：按 prerequisites.md 安装 Node 18/20 LTS，安装完**重开终端**。

### npm 下载极慢 / 卡住
**解决**：换国内镜像（只需一次）：
```bash
npm config set registry https://registry.npmmirror.com
```

## 二、初始化类

### `Error: target directory is not empty`（hexo init 失败）
**原因**：目标目录已存在且非空（里面有其他文件）。
**解决**：换一个空目录，或让 agent 在目标目录下新建子目录（如 `my-blog/`）再 init。

### `fatal: not a git repository`
**原因**：还没 `git init` 或不在项目根目录。
**解决**：进入博客目录后 `git init`。

## 三、推送 / 认证类

### `Permission denied (publickey)`
**原因**：用了 SSH 地址但没配 SSH key。
**解决**：见 github-auth.md「方式 A」，生成并添加 SSH key 到 GitHub。

### `fatal: unable to access 'https://github.com/...': Failed to connect`
**原因**：网络/代理问题，或输了错误密码。
**解决**：检查网络；HTTPS 方式请用 **PAT**（不是登录密码），见 github-auth.md「方式 B」。

### `remote: Invalid username or password`
**原因**：GitHub 已禁用密码，你填了登录密码。
**解决**：改用 PAT（方式 B）或改用 SSH（方式 A）。

### `error: failed to push some refs`
**原因**：远程仓库有本地没有的提交（如你勾选了初始化 README）。
**解决**：先 `git pull --rebase origin main` 再 `git push`；或建仓库时不要勾选 README。

## 四、部署后页面类

### 访问 `<username>.github.io` 显示 404
按顺序查：
1. **仓库名**是否严格等于 `<username>.github.io`（大小写、拼写）；
2. **仓库是否 Public**；
3. **Settings → Pages → Source** 是否选了 **GitHub Actions**；
4. Actions 是否跑完（仓库 **Actions** 标签页看绿色对勾）；
5. `_config.yml` 的 `url` / `root` 是否与仓库一致（项目页 root 要带子路径）。

### 页面出来了但样式全乱 / 没 CSS
**原因**：`root` 配错（项目页没带子路径）。
**解决**：
- 用户页（`username.github.io`）：`root: /`
- 项目页（`username.github.io/my-blog`）：`root: /my-blog/`，`url` 同步改

### 部署后页面没更新
**原因**：GitHub Pages 有缓存，首次生效需 **1–10 分钟**；之后通常几十秒。
**解决**：等几分钟再刷新；硬刷新（Ctrl+F5）清浏览器缓存；确认最新 commit 已 push 且 Actions 跑绿。

### Actions 标红（构建失败）
**解决**：进仓库 **Actions** 标签页 → 点失败的任务 → 看 **build** 步骤日志，按上面「安装/初始化类」对应解决（最常见是 Node 版本或依赖装不上）。

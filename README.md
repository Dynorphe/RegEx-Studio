# RegEx Studio - .NET & JS 在线正则表达式测试工具

支持 .NET 命名分组语法 `(?<name>...)` 与 `(?'name'...)`、测试文本与匹配结果上下双栏对照、实时彩虹括号/分组高亮、分组详情表（支持折叠与表头拖拽调宽）、正则替换预览及语法速查表的纯静态工具。

## 部署到 GitHub Pages 指南

本项目基于 Vite 构建，已预先配置了相对路径引用 (`base: './'`)，是 **100% 纯客户端静态页面**，非常适合直接托管在 GitHub Pages。

---

### 方法一：通过 GitHub Actions 自动构建与部署（最推荐）

项目中已经为您生成好了工作流配置文件 `.github/workflows/deploy.yml`。

1. **推送代码到 GitHub 仓库**：
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit for RegEx Studio"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<你的仓库名>.git
   git push -u origin main
   ```

2. **在 GitHub 仓库开启 Pages 自动化部署**：
   - 打开您的 GitHub 仓库页面，点击顶部的 **Settings**（设置）。
   - 在左侧菜单点击 **Pages**。
   - 在 **Build and deployment** 下方的 **Source** 下拉菜单中，选择 **GitHub Actions**。
   - 每次您向 `main` 分支推送代码，GitHub 会自动编译生成并发布到 `https://<你的用户名>.github.io/<你的仓库名>/`。

---

### 方法二：本地编译后直接上传 dist 目录

如果您不想使用 GitHub Actions，也可以直接本地打包上传：

1. **本地执行打包命令**：
   ```bash
   npm run build
   ```
   打包完成后会在项目根目录生成 `dist/` 文件夹（包含 `index.html` 以及 `assets/` 静态资源）。

2. **部署 `dist/` 目录**：
   - **方式 A（使用 gh-pages 工具）**：
     ```bash
     npx gh-pages -d dist
     ```
   - **方式 B（手动推送到 gh-pages 分支）**：
     将 `dist` 目录内的所有文件直接推送到仓库的 `gh-pages` 分支。
   - 在仓库 **Settings -> Pages -> Source** 中选择 **Deploy from a branch**，分支选择 `gh-pages` 即可。

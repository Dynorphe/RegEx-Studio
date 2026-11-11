# 修复 GitHub Actions 部署报错（缺少 package-lock.json）

解决 GitHub Actions 部署时由于仓库中不包含 `package-lock.json` 导致的 `Error: Dependencies lock file is not found` 报错。

## User Review & Critical Decisions

> [!IMPORTANT]
> **报错原因分析**：
> AI Studio 导出的代码仓库默认不包含 `package-lock.json` 锁文件，而 `.github/workflows/deploy.yml` 中的两处配置强依赖该锁文件：
> 1. `actions/setup-node@v4` 配置了 `cache: 'npm'`（启用缓存时必须校验锁文件，否则直接报错退出）。
> 2. 依赖安装步骤使用了 `npm ci`（`npm ci` 要求必须存在 `package-lock.json`）。

- **修复方案**：
  1. 在 `.github/workflows/deploy.yml` 的 `Setup Node.js` 步骤中移除 `cache: 'npm'`，使其不强制查找 `package-lock.json`。
  2. 将 `Install dependencies` 步骤中的 `run: npm ci` 改为 `run: npm install`，使其可直接根据 `package.json` 完成安装与后续静态打包。

---

## 1. Technical Changes

```
┌──────────────────────────────────────────────────────────────────────┐
│ .github/workflows/deploy.yml                                         │
│                                                                      │
│ - uses: actions/setup-node@v4                                        │
│   with:                                                              │
│     node-version: 20                                                 │
│     (移除 cache: 'npm'，避免无 lockfile 时报错)                      │
│                                                                      │
│ - name: Install dependencies                                         │
│   run: npm install  (由 npm ci 改为 npm install)                     │
└──────────────────────────────────────────────────────────────────────┘
```

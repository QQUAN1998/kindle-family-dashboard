# Kindle 家庭看板：部署与安装

本指南面向 Windows PowerShell。其他系统可使用相同 Node 命令，但 USB 安装脚本目前只接受 Windows 盘符根目录。先看 [README](../README.md) 的设备与安全边界。

## 1. 准备设备和云环境

- Kindle 已越狱，可以正常进入原生书架；已安装 KPM、FBInk、KOReader LuaJIT，并能通过 USB 显示为盘符。
- 已验证屏幕为 600 x 800。不要把安装脚本用于未确认兼容性的其他机型或屏幕尺寸。
- Kindle 和电脑可联网，Kindle 系统时间及中国时区设置正确。看板右上角直接读取 Kindle 的系统时间。
- 腾讯云 CloudBase 环境已开通云函数、云数据库、云存储、静态托管。请在数据库中创建 `kd_dashboard` 集合。准备好环境 ID、静态托管 HTTPS 域名，以及云函数 HTTP 访问域名。建议新建一个专用环境。
- 电脑安装 Node.js 24、Git、tar 和腾讯云 CLI；在 CloudBase CLI 中登录自己的账号。云函数应支持 Nodejs20.19。

把下例中的占位地址换成你自己控制台显示的地址。`API_URL` 必须是可在外网访问且以 `/kd-api` 结尾的 HTTPS 地址；`SITE_ORIGIN` 是静态托管域名的 origin，不带 `/kd-dashboard` 路径。

## 2. 克隆、检查、生成本地私密配置

```powershell
git clone https://github.com/QQUAN1998/kindle-family-dashboard.git
cd kindle-family-dashboard
npm ci
npm run check
node scripts/generate-secrets.js
node scripts/configure-cloudbase.js YOUR_ENV_ID https://YOUR_API_HOST/kd-api https://YOUR_HOSTING_HOST
```

上述脚本只在本地写入 `.env.local`、`cloudbaserc.json`、`work/deployment-secrets.json` 和 `work/deploy-config.json`，不会输出密钥；这些文件都被 git 忽略。不要把整个项目目录压缩后公开分享。

## 3. 部署云函数和手机网页

```powershell
npx --yes -p @cloudbase/cli tcb login
npm run build
npm run prepare:function
npx --yes -p @cloudbase/cli tcb fn deploy kd_api --httpFn --path /kd-api --force --dir functions/kd_api --install-dependency false
npx --yes -p @cloudbase/cli tcb hosting deploy dist/site /kd-dashboard --verify
```

如果首次部署后函数域名与预填的不一致，重新运行 `configure-cloudbase.js`，再 `npm run build` 并部署网页；确认 CloudBase HTTP 网关的路径确实为 `/kd-api`。建议先在浏览器访问 `API_URL/health`，确认返回健康状态。静态托管管理网页是 `https://YOUR_HOSTING_HOST/kd-dashboard/`。

## 4. 初始化两位手机用户

选择两个不同的四位数字密码。不要把真实密码写进命令历史或仓库；在终端交互输入：

```powershell
$env:KD_PIN1 = Read-Host 'First PIN / 第一位密码'
$env:KD_PIN2 = Read-Host 'Second PIN / 第二位密码'
node scripts/bootstrap-production.js https://YOUR_API_HOST/kd-api
node scripts/validate-production.js https://YOUR_API_HOST/kd-api
Remove-Item Env:KD_PIN1, Env:KD_PIN2
```

初始化只能执行一次。验证命令会检查登录、城市检索、黄历和 600 x 800 PNG，并在忽略目录 `work/` 中保存云端快照。使用手机打开管理网页，分别用两个密码登录；修改城市、家庭名称、黑板或倒计时后再检查 Kindle 预览。

## 5. 生成专属安装包并安装到 Kindle

```powershell
npm run build
node scripts/generate-kindle-config.js https://YOUR_API_HOST/kd-api
```

上一步生成私有 `dist/kindle-dashboard_1.0.0_kindlehf.kpkg` 和 `dist/kindle-package/kindle-dashboard/config/dashboard.conf`。**不要上传它们到 GitHub 或发给其他人；包中包含你自己的设备令牌。**

把 Kindle 用 USB 接到电脑，确认盘符根目录里有 `kmc/kpm/kpm.db`、`libkh/bin/fbink`、`koreader/luajit`。假设盘符是 `E:`：

```powershell
node scripts/install-kpm-usb.js E:\
```

脚本会备份 KPM 数据库为 `kmc/kpm/kpm.before-kindle-dashboard.db`，复制私有安装包、看板脚本及 KUAL 扩展，并登记 KPM 项目。此脚本针对已验证的 KPM 数据库结构；出现结构错误时停止，不要继续手动改数据库。安全弹出 Kindle 后，从书架打开 `KindleDashboard` 脚本入口，或在 KUAL 中选择“打开家庭看板”。看板下方的“刷新”会请求新快照，“返回书架”应返回 Kindle 原生书架。

## 日常使用和排查

- 内容不是秒级实时：手机保存后，Kindle 默认至多约五分钟轮询一次；可点“刷新”。天气服务端缓存约三十分钟，时钟每分钟由 Kindle 本地绘制。
- 时间错误：先在 Kindle 原生界面核对系统时间和时区。云端不会替 Kindle 校时。
- 无天气：检查城市是否从搜索结果中选中、云函数可访问 Open-Meteo、设备 Wi-Fi 是否正常。
- 空白或启动失败：检查 `kindle-dashboard/state/dashboard.log` 和 KPM/FBInk/KOReader LuaJIT 状态；重新运行本地构建和安装脚本。不要公开日志中的完整请求地址。
- 想看书：点击“返回书架”或用 KUAL 的“返回书架”。本项目不会移除 Kindle 原有书籍。
- 更新源码后重新 `npm run check`、部署云函数与网页、重新生成私有 `.kpkg`、再通过 USB 安装。保留自己的本地密钥文件，不要覆盖为他人的配置。

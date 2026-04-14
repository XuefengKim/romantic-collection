# deploy

服务器部署辅助脚本：

- `bootstrap-ubuntu-22.04.sh`
  - 在全新 Ubuntu 22.04 服务器上安装 Node.js / MySQL / Nginx / Git / PM2
  - 需要 root 权限执行
- `update-backend.sh`
  - 在服务器已完成首轮部署后，用于后续拉取 GitHub 最新代码并重启后端

> 说明：这两个脚本不会替你填写 `.env`，也不会替你在微信后台配置域名；这些仍需要人工完成。

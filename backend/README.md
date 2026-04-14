# backend

P0 后端工程，技术栈：Node.js + Express + MySQL + Prisma。

## 1. 当前状态
- 已完成 P0 基础工程骨架
- 已准备 Prisma schema、Prisma 配置与 SQL 初始化脚本
- 当前部分 controller 仍是 mock / 过渡实现，后续会逐步替换为真实数据库逻辑

## 2. 目录说明
- `src/`：后端源码
- `prisma/schema.prisma`：Prisma 数据模型
- `prisma.config.ts`：Prisma 读取 `DATABASE_URL` 的配置入口
- `sql/init.sql`：MySQL 初始化脚本
- `.env.example`：环境变量模板
- `ecosystem.config.js`：PM2 启动配置样板
- `deploy/nginx.romantic-collection.conf.example`：Nginx 反向代理样板

## 3. 环境变量
先复制：
```bash
cp .env.example .env
```

至少补齐以下变量：
- `APP_SECRET`
- `JWT_SECRET`
- `DATABASE_URL`

默认模板：
```env
PORT=3000
NODE_ENV=development
APPID=wxa44320a7dbcd779e
APP_SECRET=请替换成你在微信后台拿到的真实 AppSecret
JWT_SECRET=请替换成高强度随机字符串
DATABASE_URL=mysql://root:你的数据库密码@127.0.0.1:3306/romantic_collection
WECHAT_CODE2SESSION_URL=https://api.weixin.qq.com/sns/jscode2session
```

## 4. 本地启动
### 4.1 安装依赖
```bash
npm install
```

### 4.2 生成 Prisma Client
```bash
npm run prisma:generate
```

### 4.3 初始化数据库
如果本地 MySQL 已启动，可执行：
```bash
mysql -uroot -p < sql/init.sql
```

### 4.4 启动开发服务
```bash
npm run dev
```

健康检查：
- `GET /health`
- 预期返回：`{"code":0,"message":"ok","data":{"status":"up"}}`

## 5. 常用脚本
```bash
npm run dev              # 本地开发（nodemon）
npm run start            # 普通启动
npm run start:prod       # 生产模式启动
npm run prisma:generate  # 生成 Prisma Client
npm run prisma:dbpush    # 将 Prisma schema 推到数据库
npm run prisma:studio    # 打开 Prisma Studio
```

## 6. 推荐上线方案（当前阶段）
推荐使用：**腾讯云轻量服务器 + Node.js + MySQL（装在同一台服务器） + PM2 + Nginx**。

原因：
- 不依赖你个人电脑常开
- 不必额外购买托管版 MySQL
- 成本更低，适合 MVP / P0 阶段
- 结构简单，排障成本低

## 7. 服务器部署最短路径
假设服务器目录为：`/opt/romantic-collection/backend`

### 7.1 安装运行环境
- Node.js LTS
- MySQL 8
- PM2
- Nginx

### 7.2 上传代码并安装依赖
```bash
cd /opt/romantic-collection/backend
npm install
npm run prisma:generate
```

### 7.3 配置环境变量
```bash
cp .env.example .env
```
然后把 `.env` 改成服务器真实值，尤其是：
- `APP_SECRET`
- `JWT_SECRET`
- `DATABASE_URL`

如果 MySQL 就装在当前服务器，推荐：
```env
DATABASE_URL=mysql://root:你的数据库密码@127.0.0.1:3306/romantic_collection
NODE_ENV=production
PORT=3000
```

### 7.4 初始化数据库
```bash
mysql -uroot -p < sql/init.sql
```

### 7.5 启动服务
先验证能否启动：
```bash
npm run start:prod
```

再切到 PM2 守护：
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7.6 Nginx 反向代理
参考：`deploy/nginx.romantic-collection.conf.example`

### 7.7 微信后台配置
把正式域名加入小程序 `request` 合法域名。

## 8. 哪些操作必须你本人完成
### 腾讯云后台
- 购买/进入轻量服务器
- 获取公网 IP
- 配置登录方式
- 放通安全组端口（22 / 80 / 443；3000 仅临时排障时可短期开）

### 微信小程序后台
- 查看并保管 `AppSecret`
- 配置 `request` 合法域名
- 正式环境启用 HTTPS 后，再走真机请求验证

## 9. 当前阶段建议
### 开发联调阶段
- 可以临时本地连 MySQL
- 但只用于调试，不用于正式上线

### 准备上线阶段
- 把 MySQL 和 Node 都放到腾讯云轻量服务器
- 小程序改请求线上域名
- 用 PM2 + Nginx 托管服务

## 10. 相关文档
- `../docs/development/architecture/2026-04-13-p0-backend-architecture.md`
- `../docs/development/architecture/2026-04-13-database-design.md`
- `../docs/development/api/backend-api-v1.md`
- `../docs/development/deployment/2026-04-13-backend-deployment-checklist.md`

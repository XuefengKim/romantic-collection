# 后端部署与配置清单（P0）

## 1. 文档目标
这份文档用于帮助项目从“本地 MVP + mock/半真实后端”过渡到“可在线部署、可供小程序真实请求”的后端环境。

适用范围：
- 微信小程序 AppID：`wxa44320a7dbcd779e`
- 项目根目录：`/Users/mac/Desktop/小程序`
- 后端目录：`/Users/mac/Desktop/小程序/backend`
- 当前推荐方案：**腾讯云轻量服务器 + Node.js + MySQL（同机部署） + PM2 + Nginx**

---

## 2. 为什么当前推荐“轻量服务器自建 MySQL”
相比“数据库放本机”或“直接购买腾讯云托管 MySQL”，当前阶段更适合：

- **比本地部署稳定**：不依赖你自己的电脑一直开机
- **比托管 MySQL 更省钱**：通常不需要立刻额外购买数据库实例
- **比前期拆多台服务更简单**：Node 和 MySQL 放在同一台服务器，联调更直接
- **足够支撑 MVP / P0 阶段**：等真实用户量增长后再升级架构

不建议把数据库长期放本机的原因：
- 你的电脑关机后，线上服务就不可用
- 外网访问本机要处理端口映射、动态 IP、网络安全问题
- 不适合真实用户使用

---

## 3. 责任划分：我能做什么，你必须做什么

### 3.1 我可以继续帮你做的
- 后端代码实现与重构
- 数据库表结构设计、Prisma schema、SQL 初始化脚本
- `.env.example`、README、部署文档完善
- Node / PM2 / Nginx 配置样板准备
- 接口联调、报错排查
- 小程序端 API 接入改造

### 3.2 必须你本人操作的事项

#### A. 腾讯云后台
1. 登录腾讯云账号
2. 创建或进入已有轻量应用服务器
3. 获取服务器公网 IP
4. 配置登录方式（密码或 SSH 密钥）
5. 配置防火墙 / 安全组端口：
   - `22`：SSH 登录
   - `80`：HTTP（申请证书前可临时用）
   - `443`：HTTPS（正式环境建议必须开）
   - `3000`：仅在临时排障时短期开，正式环境不建议长期暴露
6. 如果你购买了独立域名：
   - 在域名解析后台把域名指向服务器公网 IP
7. 如果你后续改用腾讯云托管 MySQL：
   - 需要你本人在腾讯云后台购买并配置白名单

#### B. 微信小程序后台
1. 登录微信公众平台 / 小程序后台
2. 获取并妥善保管 `AppSecret`
3. 在“开发管理”中配置 `request` 合法域名
4. 正式接 HTTPS 后，在微信后台配置正式域名
5. 不要把 `AppSecret` 放进前端代码仓库或小程序端源码中

---

## 4. 当前后端关键文件
- `backend/.env.example`：环境变量模板
- `backend/prisma/schema.prisma`：Prisma 数据模型
- `backend/prisma.config.ts`：Prisma 从 `DATABASE_URL` 读取连接配置
- `backend/sql/init.sql`：MySQL 初始化脚本（建库、建表、种子数据）
- `backend/ecosystem.config.js`：PM2 配置样板
- `backend/deploy/nginx.romantic-collection.conf.example`：Nginx 反向代理样板

---

## 5. 环境变量清单
后端 `.env` 至少需要以下变量：

```env
PORT=3000
NODE_ENV=development
APPID=wxa44320a7dbcd779e
APP_SECRET=请替换成微信后台真实 AppSecret
JWT_SECRET=请替换成高强度随机字符串
DATABASE_URL=mysql://root:你的数据库密码@127.0.0.1:3306/romantic_collection
WECHAT_CODE2SESSION_URL=https://api.weixin.qq.com/sns/jscode2session
```

### 字段说明
- `PORT`：Node 服务监听端口
- `NODE_ENV`：开发环境用 `development`，服务器建议 `production`
- `APPID`：小程序 AppID
- `APP_SECRET`：微信后台拿到的密钥，仅后端保存
- `JWT_SECRET`：服务端签名密钥，必须使用随机强密码
- `DATABASE_URL`：MySQL 连接串
- `WECHAT_CODE2SESSION_URL`：微信登录换 session 官方地址

### 线上环境推荐值
如果 MySQL 就部署在同一台服务器：
```env
PORT=3000
NODE_ENV=production
DATABASE_URL=mysql://root:你的数据库密码@127.0.0.1:3306/romantic_collection
```

---

## 6. 本地开发联调流程（仅开发调试）

### 6.1 安装依赖
```bash
cd /Users/mac/Desktop/小程序/backend
npm install
```

### 6.2 准备环境变量
```bash
cp .env.example .env
```
然后把 `.env` 中的真实值填上。

### 6.3 启动本地 MySQL（如果走本地联调）
要求：
- 3306 端口可用
- 用户名密码与 `DATABASE_URL` 保持一致
- 数据库名为 `romantic_collection`

### 6.4 初始化数据库
```bash
mysql -uroot -p < sql/init.sql
```

### 6.5 生成 Prisma Client
```bash
npm run prisma:generate
```

### 6.6 启动服务
```bash
npm run dev
```

### 6.7 验证健康接口
访问：
```bash
curl http://127.0.0.1:3000/health
```
预期返回：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "status": "up"
  }
}
```

---

## 7. 腾讯云轻量服务器部署步骤（推荐）
以下为当前阶段最推荐的上线方案。

### 7.1 服务器基础准备
建议系统：**Ubuntu 22.04 LTS**

建议安装：
- Node.js LTS
- npm
- MySQL 8
- PM2
- Nginx
- Git

### 7.2 代码上传位置建议
建议项目放在：
```bash
/opt/romantic-collection
```
后端目录即：
```bash
/opt/romantic-collection/backend
```

### 7.3 服务器上安装后端依赖
```bash
cd /opt/romantic-collection/backend
npm install
npm run prisma:generate
```

### 7.4 配置服务器环境变量
```bash
cp .env.example .env
```
重点修改：
- `NODE_ENV=production`
- `APP_SECRET=你的微信后台真实密钥`
- `JWT_SECRET=随机强密码`
- `DATABASE_URL=mysql://root:你的数据库密码@127.0.0.1:3306/romantic_collection`

### 7.5 初始化 MySQL 数据库
先确保 MySQL 服务已启动，然后执行：
```bash
mysql -uroot -p < sql/init.sql
```

这一步会：
- 创建数据库 `romantic_collection`
- 创建业务表
- 写入任务目录、卡牌目录的初始化数据

### 7.6 先直接启动一次 Node 验证
```bash
npm run start:prod
```
看到服务正常后，再切换到 PM2。

### 7.7 使用 PM2 守护进程
项目中已提供样板文件：`backend/ecosystem.config.js`

如果服务器目录与样板中的 `cwd` 不一致，请先修改该文件中的路径。

启动命令：
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

常用排查命令：
```bash
pm2 list
pm2 logs romantic-backend
pm2 restart romantic-backend
```

### 7.8 配置 Nginx 反向代理
项目中已提供样板：
`backend/deploy/nginx.romantic-collection.conf.example`

你需要把其中的：
- `server_name your-domain.com;`
替换成你自己的正式域名。

Nginx 的目标是：
- 外部访问 `https://你的域名`
- Nginx 转发到 `http://127.0.0.1:3000`

### 7.9 配置 HTTPS
正式给小程序真机访问前，建议启用 HTTPS。

通常流程：
1. 先准备域名
2. 域名解析到服务器公网 IP
3. 申请证书（腾讯云 / Let's Encrypt 均可）
4. 在 Nginx 中配置 443
5. 把 HTTPS 域名配置到微信小程序后台的 `request` 合法域名

---

## 8. 安全组 / 端口建议

### 建议长期开放
- `22`：SSH
- `80`：HTTP（申请证书、跳转 HTTPS 等场景）
- `443`：HTTPS

### 仅排障时临时开放
- `3000`：Node 直连调试端口

### 不建议公网开放
- `3306`：MySQL 端口

当前推荐架构下，MySQL 只给服务器本机访问即可：
- Node 连接 `127.0.0.1:3306`
- 不对公网开放数据库端口，安全性更高

---

## 9. 上线前检查清单
### 服务器侧
- [ ] 已拿到服务器公网 IP
- [ ] 已能 SSH 登录服务器
- [ ] 已安装 Node.js / npm / MySQL / PM2 / Nginx
- [ ] 已上传后端代码到 `/opt/romantic-collection/backend`
- [ ] 已执行 `npm install`
- [ ] 已执行 `npm run prisma:generate`
- [ ] 已创建并填写 `.env`
- [ ] 已执行 `mysql -uroot -p < sql/init.sql`
- [ ] 已通过 `curl http://127.0.0.1:3000/health` 验证服务
- [ ] 已通过 PM2 托管服务
- [ ] 已配置 Nginx
- [ ] 已申请并配置 HTTPS

### 微信后台侧
- [ ] 已确认 `AppSecret` 可用
- [ ] 已配置正式 `request` 合法域名
- [ ] 已用真机验证请求链路可用

---

## 10. 常见风险与提醒
- `AppSecret` 绝不能写进前端代码
- `JWT_SECRET` 必须替换为高强度随机值
- 正式环境不要长期裸露 `3000` 端口
- 推荐不要公网开放 `3306`
- 如果微信后台未配置合法域名，小程序真机无法正常请求线上接口
- 如果服务器目录不是 `/opt/romantic-collection/backend`，记得同步修改 `ecosystem.config.js`

---

## 11. 当前阶段你最先要完成的人工动作
按优先级排序：
1. **确认腾讯云轻量服务器可登录**
2. **拿到公网 IP**
3. **准备服务器 root / sudo 登录方式**
4. **准备微信后台 AppSecret**
5. **如果已有域名，先做域名解析；没有域名也可以先用 IP 进行后端侧验证**

---

## 12. 我这边接下来的衔接工作
在你准备服务器期间，我这边可以继续推进：
1. 把 mock controller 替换为真实数据库读写
2. 补充登录、绑定、首页、打卡、抽卡、收藏册接口的真实实现
3. 补前后端联调说明
4. 协助你把服务器环境变量、启动命令、Nginx 配置最终收口

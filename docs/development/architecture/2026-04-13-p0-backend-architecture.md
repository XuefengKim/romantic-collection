# P0 技术方案（腾讯云轻量服务器 + Node.js + MySQL）

## 目标
为微信小程序建立最小线上化能力，支撑以下 P0：
1. 微信登录 / 用户唯一标识
2. 情侣关系绑定（邀请码 / 确认绑定）
3. 云端数据库表设计
4. 基础异常处理与降级兜底
5. 线上交互后端能力

## 技术选型
- 部署：腾讯云轻量应用服务器
- 后端：Node.js + Express
- 数据库：MySQL 8
- ORM：Prisma
- 认证：微信小程序 code2Session + 服务端签发 session token

## 最小系统边界
### 前端负责
- 调用 wx.login 获取 code
- 调用后端登录接口换取 session
- 携带 token 调用后续接口
- 本地做轻缓存和异常提示

### 后端负责
- 微信 code 换 openid
- 用户注册/查找
- 情侣邀请码生成与绑定
- 云端状态读写
- 打卡/抽卡/收藏业务规则
- 异常码与统一返回结构

## 后端目录结构
- backend/src/app.js
- backend/src/server.js
- backend/src/config/
- backend/src/routes/
- backend/src/controllers/
- backend/src/services/
- backend/src/repositories/
- backend/src/middlewares/
- backend/src/utils/
- backend/prisma/schema.prisma
- backend/sql/init.sql

## 数据表（P0）
1. users：用户
2. couple_pairs：情侣关系
3. invite_codes：邀请码
4. user_stats：用户核心状态
5. checkin_records：打卡记录
6. draw_records：抽卡记录
7. card_catalog：卡池定义
8. task_catalog：任务定义
9. user_card_collection：用户收藏

## P0 接口
1. POST /api/auth/wechat-login
2. GET /api/me
3. POST /api/couple/invite-code
4. POST /api/couple/bind
5. GET /api/home/state
6. POST /api/checkin
7. POST /api/draw
8. GET /api/collection

## 异常处理原则
- 接口统一返回 code/message/data
- 未登录：401
- 参数错误：400
- 业务冲突：409
- 服务异常：500
- 前端遇到错误要有友好 toast，不允许白屏

## 你需要配合的事项（后续）
1. 注册腾讯云账号
2. 开通轻量服务器
3. 开通 MySQL 或在服务器内安装 MySQL
4. 在微信小程序后台配置 request 合法域名
5. 提供微信小程序 AppSecret（仅你自己保管，后续填入服务端环境变量）

# 解绑能力与已绑定态页面优化研发方案

> 对应产品文档：`docs/product/requirements/解绑与已绑定态页面优化需求.md`

---

## 1. 目标

本次研发改动要一次性完成以下目标：

1. 首页删除冗余顶部说明卡片。
2. 首页将“情侣绑定”大卡片收缩为轻量状态区。
3. 绑定页按状态分层：
   - 未绑定：保留邀请码生成 / 输入邀请码绑定。
   - 已绑定：仅保留成功卡片 + `返回我们的秘密空间` / `取消绑定` 两个按钮。
4. 新增正式解绑能力。
5. 解绑采用方案 B：
   - 解除两个人之间的绑定关系；
   - 删除所有相关数据；
   - 清空前端本地状态与测试态残留；
   - 回到未绑定初始态。
6. 补强服务端绑定态校验，避免核心业务规则只靠前端拦截。
7. 评估并收口 `HAKBONG` 本地匿名绑定测试入口，避免正式用户误用。

---

## 2. 当前代码现状

### 2.1 前端
- 默认首屏：`pages/pair/pair`
- 首页：`pages/index/index`
- 收藏页：`pages/collection/collection`
- 绑定服务：`services/coupleService.js`
- 登录/本地绑定状态：`services/authService.js`
- 首页/收藏/打卡/抽卡状态管理：`services/statsService.js`
- 本地数据存储：`repositories/statsRepository.js`

### 2.2 后端
- 绑定路由：`backend/src/routes/coupleRoutes.js`
- 绑定控制器：`backend/src/controllers/coupleController.js`
- 绑定服务：`backend/src/services/coupleService.js`
- 首页控制器：`backend/src/controllers/homeController.js`
- 收藏控制器：`backend/src/controllers/collectionController.js`
- 核心玩法服务：`backend/src/services/gameService.js`

### 2.3 已确认问题
1. 前端已有 `HAKBONG` 本地匿名绑定入口，且默认开启。
2. 当前没有正式解绑接口。
3. 首页 / 抽卡 / 收藏等核心接口后端未做“必须已绑定”的硬校验。
4. 前端本地匿名绑定状态 `LOCAL_BIND_MODE` 有进入逻辑，但没有统一退出清理闭环。

---

## 3. 本次改动范围

## 3.1 前端改动文件
### 必改
- `pages/index/index.js`
- `pages/index/index.wxml`
- `pages/index/index.wxss`
- `pages/pair/pair.js`
- `pages/pair/pair.wxml`
- `pages/pair/pair.wxss`
- `services/coupleService.js`
- `services/authService.js`
- `services/statsService.js`
- `repositories/statsRepository.js`
- `config/env.js`

### 可能改动
- `pages/collection/collection.js`
- `pages/collection/collection.wxml`
- `pages/collection/collection.wxss`
- `services/api/client.js`

## 3.2 后端改动文件
### 必改
- `backend/src/routes/coupleRoutes.js`
- `backend/src/controllers/coupleController.js`
- `backend/src/services/coupleService.js`
- `backend/src/controllers/homeController.js`
- `backend/src/controllers/collectionController.js`
- `backend/src/services/gameService.js`

### 可能改动
- `backend/src/utils/appError.js`
- `docs/development/api/backend-api-v1.md`
- `docs/development/architecture/2026-04-13-database-design.md`

---

## 4. 产品规则落地为技术规则

## 4.1 解绑的真实含义
解绑不是“撤销邀请码”，而是：
- 解除当前 active couple pair
- 双方恢复 `unbound`
- 删除这段关系下的所有业务数据

## 4.2 数据删除范围
当前版本按“双方当前业务数据都重置”落地，至少需要删除或重置：

### 用户关系相关
- `couple_pairs`：当前 active pair 改为非 active（推荐 `status='cancelled'` 或 `inactive'`，保留审计记录）
- `invite_codes`：与双方相关、仍可能继续影响绑定的 code 全部失效（推荐 `revoked`）

### 用户玩法数据
对双方用户分别处理：
- `user_stats`：重置为初始值
  - `totalHearts = 0`
  - `drawChances = 0`
  - `totalDrawEarned = 0`
  - `totalDrawUsed = 0`
  - `fullCollectionAchievementShown = false`
- `checkin_records`：删除
- `draw_records`：删除
- `user_card_collections`：删除

> 当前数据库若不存在部分表或命名不同，以真实 Prisma schema 为准，但产品语义必须保证“所有数据删除”。

## 4.3 前端本地状态删除范围
解绑成功后必须清理：
- `AUTH_TOKEN`
- `USER_PROFILE`
- `PAIR_STATUS`
- `LOCAL_BIND_MODE`
- `STATS`
- 首页/收藏册/成就相关本地缓存
- 内存中的 remoteHomeStateCache
- 当前页面 data 中已绑定残留状态

---

## 5. 接口设计

## 5.1 新增接口：取消绑定
### 路由
`POST /api/couple/unbind`

### 鉴权
需要登录态：`Authorization: Bearer <token>`

### 请求体
无请求体，或保留空对象 `{}``

### 返回成功
```json
{
  "code": 0,
  "message": "解绑成功",
  "data": {
    "pairStatus": "unbound",
    "reset": true
  }
}
```

### 失败场景
- 当前未绑定：返回 409 或 400
- 数据删除失败：返回 500
- token 失效：401

### 建议错误文案
- `当前未绑定，无需取消绑定`
- `解绑失败，请稍后重试`

---

## 6. 后端实现方案

## 6.1 新增解绑路由
文件：`backend/src/routes/coupleRoutes.js`

新增：
- `router.post('/unbind', auth, coupleController.unbindCouple)`

## 6.2 新增解绑控制器
文件：`backend/src/controllers/coupleController.js`

新增方法：
- `unbindCouple(req, res, next)`

职责：
1. 读取 `req.auth.userId`
2. 调用 `unbindCoupleByUserId(userId)`
3. 返回统一成功结构

## 6.3 新增解绑服务
文件：`backend/src/services/coupleService.js`

新增方法建议：
- `getActivePairByUserId(userId)`（已有，可复用）
- `unbindCoupleByUserId(userId)`
- `assertBoundUser(userId)`（可抽公共校验）

### `unbindCoupleByUserId(userId)` 推荐流程
1. 查当前 active pair
2. 若不存在，抛错 `当前未绑定，无需取消绑定`
3. 拿到双方 userId：`userAId`, `userBId`
4. 开启事务 `prisma.$transaction`
5. 在事务中执行：
   - 更新该 pair 为非 active
   - 将双方相关 active invite codes 设为 `revoked`
   - 删除双方 `checkin_records`
   - 删除双方 `draw_records`
   - 删除双方 `user_card_collections`
   - 重置双方 `user_stats`
6. 返回解绑结果

### 为什么 pair 建议“失效”而非直接删除
优点：
- 保留最基本操作痕迹
- 便于以后加日志或审计
- 不影响产品语义（用户仍视为完全解绑）

## 6.4 后端绑定态硬校验
### 问题
当前仅前端限制未绑定用户不能玩，但后端接口仍允许已登录未绑定用户打卡/抽卡/看收藏。

### 需要补的校验点
#### 文件：`backend/src/services/gameService.js`
在以下入口增加“必须已绑定”校验：
- `performCheckin(userId, taskId)`
- `performDraw(userId)`
- `getUserCollectionState(userId)`
- 如有必要，`buildHomeState(userId, pairStatus, tasks)` 也可补兜底逻辑

### 建议实现方式
新增公共方法：
- `ensureUserBound(userId)` 或
- `assertBoundUser(userId)`

逻辑：
1. 调用 `getPairStatusByUserId(userId)`
2. 若不是 `bound`，抛出 403 / 409

建议文案：
- `请先完成情侣绑定，再进入你们的秘密空间`

> 注：`GET /api/home/state` 可以继续返回 `pairStatus`，方便前端识别是否已绑定；但 checkin/draw/collection 等实际玩法接口必须硬限制。

---

## 7. 前端实现方案

## 7.1 首页收缩
### 文件
- `pages/index/index.wxml`
- `pages/index/index.js`
- `pages/index/index.wxss`

### 改动
1. 删除顶部说明卡片
2. 将“情侣绑定”大卡片收缩为轻量状态区
3. 已绑定时显示：
   - 文案：`已绑定`
   - 点击进入绑定页
4. 未绑定异常进入首页时，继续保留重定向回绑定页逻辑

---

## 7.2 绑定页按状态分层
### 文件
- `pages/pair/pair.wxml`
- `pages/pair/pair.js`
- `pages/pair/pair.wxss`

### 已绑定态
仅保留：
- 成功卡片
- 按钮 1：`返回我们的秘密空间`
- 按钮 2：`取消绑定`

不再展示：
- 生成邀请码区
- 输入邀请码区
- 大段说明文字

### 未绑定态
保留当前主链路：
- 生成邀请码
- 输入邀请码
- 绑定
- 手动刷新

并可适度精简说明文案。

---

## 7.3 新增取消绑定弹窗
### 交互建议
使用 `wx.showModal` 即可先实现 MVP，无需自定义复杂弹窗。

### 必须满足
- 标题：`确认取消绑定吗？`
- 内容必须明确包含：
  - 解除当前绑定关系
  - 删除所有数据
  - 无法恢复

### 建议文案
`取消后，你们将解除当前绑定关系，并删除所有数据（包括心意、抽卡次数、收藏册等内容），且无法恢复。`

### 交互按钮
- cancelText: `我再想想`
- confirmText: `确认取消绑定`

> 如 `wx.showModal` 无法单独配置危险按钮样式，则先保证文案到位，样式优化可放后续。

---

## 7.4 前端解绑服务
### 文件
- `services/coupleService.js`
- `repositories/coupleRepository.js`

### 新增方法
- `coupleRepository.unbindCouple()` -> 调用 `/api/couple/unbind`
- `coupleService.unbindCouple()` -> 包装登录态与失败重试逻辑

### 特殊处理：本地匿名绑定测试态
若当前命中 `authService.isLocalAnonymousBound()`：
- 不走远端接口
- 直接执行本地清理逻辑
- 返回 `{ pairStatus: 'unbound', reset: true, source: 'local' }`

这样能统一收口 `HAKBONG` 测试态残留问题。

---

## 7.5 前端统一清理逻辑
### 文件
- `services/authService.js`
- `services/statsService.js`
- `repositories/statsRepository.js`

### 需要新增/调整的方法
#### `authService`
建议新增：
- `resetAllLocalState()`

职责：
- 清 token / user / pairStatus
- 清 LOCAL_BIND_MODE
- 调 statsRepository.clearStats()
- 清其他需要的 storage key
- 更新 app.globalData

#### `statsService`
建议新增：
- `resetRuntimeState()`

职责：
- 清空 `remoteHomeStateCache`
- 让页面回到默认初始态时不带旧缓存

### 最终解绑成功后调用顺序建议
1. 执行远端或本地解绑
2. 调 `statsService.resetRuntimeState()`
3. 调 `authService.resetAllLocalState()`
4. `wx.reLaunch({ url: '/pages/pair/pair' })`

---

## 7.6 收藏页兜底
### 文件
- `pages/collection/collection.js`

### 建议补充
收藏页加载前增加兜底判断：
- 若未绑定且非本地匿名绑定态，直接跳回绑定页或首页重定向链路

虽然最终后端也会拦截，但前端最好一起兜底，避免页面闪错误。

---

## 7.7 `HAKBONG` 收口建议
### 最低要求
- 正式版本中关闭：`ENABLE_LOCAL_ANONYMOUS_BIND: false`

### 如果开发阶段仍要保留
至少要满足：
1. 正式环境不可用
2. 不在 UI 文案中出现任何提示
3. 解绑后能彻底清除测试态

> 推荐最终做法：通过环境区分开关，而不是把 `HAKBONG` 常驻线上配置。

---

## 8. API 文档同步要求
文件：`docs/development/api/backend-api-v1.md`

需补充：
1. `POST /api/couple/unbind`
2. 未绑定用户访问核心玩法接口时的错误定义
3. 解绑后数据删除语义说明

---

## 9. 验收清单

## 9.1 首页
- 顶部大说明卡片已移除
- 已绑定状态区为轻量展示
- 点击状态区能进入绑定页

## 9.2 绑定页
- 未绑定态主流程可用
- 已绑定态只显示成功卡片 + 两个按钮
- 已绑定态不再出现邀请码生成/输入区

## 9.3 解绑弹窗
- 二次确认一定出现
- 文案明确写明“删除所有数据，且无法恢复”

## 9.4 解绑成功结果
- 双方回到未绑定
- 首页无法继续进入秘密空间
- 打卡 / 抽卡 / 收藏均不可继续访问
- 前端缓存已清空
- 本地匿名测试态已清除
- 页面回到绑定页初始态

## 9.5 服务端规则
- 已登录但未绑定用户，无法调用 checkin / draw / collection 等核心玩法接口
- `/api/home/state` 仍可正常返回 pairStatus 用于前端判断

---

## 10. 推荐实施顺序

### 第 1 步：后端先行
1. 新增 `/api/couple/unbind`
2. 实现解绑事务
3. 给 checkin / draw / collection 补服务端绑定态校验
4. 更新 API 文档

### 第 2 步：前端接入
1. 首页收缩
2. 绑定页已绑定态改造
3. 新增取消绑定弹窗
4. 接入解绑接口 / 本地解绑逻辑
5. 增加统一本地清理逻辑
6. 补收藏页兜底

### 第 3 步：测试入口收口
1. 将 `HAKBONG` 仅保留在开发环境，或直接关闭
2. 验证解绑后不会保留测试态

---

## 11. 风险提醒

1. **数据删除是破坏性操作**：开发时务必先在测试环境验证，不要直接在生产数据上试。
2. **当前数据是否天然按 pair 归属**：如果现有表是按 user 归属，方案 B 会表现为“解绑时清双方用户数据”；需确认这是否符合现阶段业务预期。
3. **单方解绑影响双方**：这是产品已接受的当前规则，代码中要保持一致，不要一边解绑一边只清单边。
4. **前后端要一起改**：仅改前端或仅改后端都会导致状态不一致。

---

## 12. 完成标志

当以下条件同时满足，可认为本需求研发完成：
- 产品文档与研发文档一致
- 后端已支持正式解绑
- 解绑后会删除所有数据
- 前端已绑定态页面收敛完成
- `HAKBONG` 不再构成正式用户风险
- 核心玩法已具备服务端绑定态硬校验

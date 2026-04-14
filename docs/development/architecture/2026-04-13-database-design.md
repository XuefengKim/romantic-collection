# P0 数据库设计（MySQL 8）

## 1. 设计目标
为微信小程序 MVP 的线上化提供最小可用数据底座，支撑以下核心链路：
1. 微信登录后识别唯一用户
2. 情侣关系绑定
3. 任务打卡累计心意值
4. 消耗抽卡次数进行抽卡
5. 维护个人收藏册与成就状态

---

## 2. 设计原则
- **先满足 P0 闭环**：优先支撑“登录 -> 绑定 -> 打卡 -> 抽卡 -> 收藏”
- **兼容后续扩展**：保留状态字段、统计字段、时间字段，方便后续扩展任务、卡池、活动
- **前后端职责清晰**：前端只负责展示和交互，业务真值以服务端数据库为准
- **便于排查问题**：核心行为保留操作记录（checkin_records / draw_records）

---

## 3. 实体关系概览

### 3.1 核心实体
- `users`：用户基础信息
- `couple_pairs`：情侣绑定关系
- `invite_codes`：邀请码记录
- `user_stats`：用户核心数值状态
- `task_catalog`：任务配置表
- `checkin_records`：打卡流水
- `card_catalog`：卡池配置表
- `draw_records`：抽卡流水
- `user_card_collection`：用户持有卡片

### 3.2 关系说明
- 一个 `user` 对应一条 `user_stats`
- 一个 `user` 可创建多条 `invite_codes`
- 两个 `user` 可组成一条 `couple_pairs`
- 一个 `user` 可产生多条 `checkin_records`
- 一个 `user` 可产生多条 `draw_records`
- 一个 `user` 可拥有多张 `user_card_collection`
- `checkin_records.task_id` 关联 `task_catalog.id`
- `draw_records.card_id` 与 `user_card_collection.card_id` 关联 `card_catalog.id`

---

## 4. 数据表设计

## 4.1 users
用户基础表，用于承接微信身份与基础资料。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK AI | 用户主键 |
| openid | VARCHAR(64) UNIQUE NOT NULL | 微信小程序用户唯一标识 |
| unionid | VARCHAR(64) NULL | 跨应用统一标识，可空 |
| nickname | VARCHAR(64) NULL | 用户昵称 |
| avatar_url | VARCHAR(255) NULL | 头像地址 |
| created_at | DATETIME NOT NULL | 创建时间 |
| updated_at | DATETIME NOT NULL | 更新时间 |

**说明**
- `openid` 是登录后查找/创建用户的核心字段。
- P0 暂不强依赖昵称头像，允许为空。

---

## 4.2 couple_pairs
情侣关系表，用于记录两个用户的绑定关系。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK AI | 关系主键 |
| user_a_id | INT NOT NULL | 用户 A |
| user_b_id | INT NOT NULL | 用户 B |
| status | VARCHAR(20) NOT NULL | 关系状态，默认 active |
| created_at | DATETIME NOT NULL | 创建时间 |
| updated_at | DATETIME NOT NULL | 更新时间 |

**索引/约束**
- `UNIQUE KEY uniq_pair (user_a_id, user_b_id)`
- `INDEX idx_user_a_id (user_a_id)`
- `INDEX idx_user_b_id (user_b_id)`

**说明**
- 应在业务层统一 user 排序，避免 `(1,2)` 和 `(2,1)` 出现两条记录。
- 后续如支持解绑/历史关系，可继续保留 `status`。

---

## 4.3 invite_codes
邀请码表，用于情侣关系绑定。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK AI | 主键 |
| code | VARCHAR(16) UNIQUE NOT NULL | 邀请码 |
| creator_id | INT NOT NULL | 创建人 |
| status | VARCHAR(20) NOT NULL | active / used / expired / revoked |
| expires_at | DATETIME NOT NULL | 过期时间 |
| used_by_id | INT NULL | 使用人 |
| created_at | DATETIME NOT NULL | 创建时间 |
| updated_at | DATETIME NOT NULL | 更新时间 |

**索引/约束**
- `UNIQUE KEY uniq_code (code)`
- `INDEX idx_creator_id (creator_id)`
- `INDEX idx_used_by_id (used_by_id)`
- `INDEX idx_status_expires_at (status, expires_at)`

**说明**
- 一个邀请码只允许成功使用一次。
- 是否过期由 `expires_at` + `status` 双重控制。

---

## 4.4 user_stats
用户状态表，聚合首页展示需要的核心数值。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK AI | 主键 |
| user_id | INT UNIQUE NOT NULL | 对应用户 |
| total_hearts | INT NOT NULL DEFAULT 0 | 累计心意值 |
| draw_chances | INT NOT NULL DEFAULT 0 | 当前剩余抽卡次数 |
| total_draw_earned | INT NOT NULL DEFAULT 0 | 累计获得抽卡次数 |
| total_draw_used | INT NOT NULL DEFAULT 0 | 累计消耗抽卡次数 |
| full_collection_achievement_shown | TINYINT(1) NOT NULL DEFAULT 0 | 是否已展示集齐成就 |
| created_at | DATETIME NOT NULL | 创建时间 |
| updated_at | DATETIME NOT NULL | 更新时间 |

**说明**
- P0 首页优先查该表，不需要每次从流水现算。
- 后续可扩展更多聚合状态，如连续打卡天数、最近抽卡时间等。

---

## 4.5 task_catalog
任务配置表，用于维护可打卡任务。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | 任务 ID |
| category | VARCHAR(32) NOT NULL | 分类 |
| name | VARCHAR(128) NOT NULL | 任务名称 |
| description | VARCHAR(255) NOT NULL | 描述 |
| active | TINYINT(1) NOT NULL DEFAULT 1 | 是否启用 |
| created_at | DATETIME NOT NULL | 创建时间 |
| updated_at | DATETIME NOT NULL | 更新时间 |

**说明**
- P0 用静态种子数据初始化即可。
- 后续可增加奖励倍率、排序、限次规则等字段。

---

## 4.6 checkin_records
打卡流水表，用于保留用户完成任务的行为记录。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK AI | 主键 |
| user_id | INT NOT NULL | 用户 ID |
| task_id | INT NOT NULL | 任务 ID |
| hearts_delta | INT NOT NULL DEFAULT 1 | 本次增加的心意值 |
| created_at | DATETIME NOT NULL | 创建时间 |

**索引/约束**
- `INDEX idx_user_id_created_at (user_id, created_at)`
- `INDEX idx_task_id (task_id)`

**说明**
- 该表用于追踪打卡历史与对账。
- 若后续加入“每日任务限次”，可基于 `created_at` 做日维度校验。

---

## 4.7 card_catalog
卡池定义表，用于维护卡牌静态信息。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK | 卡牌 ID |
| name | VARCHAR(128) NOT NULL | 卡牌名 |
| rarity | VARCHAR(16) NOT NULL | 稀有度 |
| description | VARCHAR(255) NOT NULL | 文案描述 |
| color | VARCHAR(16) NOT NULL | 展示色 |
| active | TINYINT(1) NOT NULL DEFAULT 1 | 是否启用 |
| created_at | DATETIME NOT NULL | 创建时间 |
| updated_at | DATETIME NOT NULL | 更新时间 |

**说明**
- P0 可由静态种子脚本初始化。
- 后续可扩展卡面图片、活动卡池、权重概率等字段。

---

## 4.8 draw_records
抽卡流水表，用于保留每次抽卡结果。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK AI | 主键 |
| user_id | INT NOT NULL | 用户 ID |
| card_id | INT NOT NULL | 抽中的卡牌 |
| rarity | VARCHAR(16) NOT NULL | 抽取时稀有度快照 |
| created_at | DATETIME NOT NULL | 创建时间 |

**索引/约束**
- `INDEX idx_user_id_created_at (user_id, created_at)`
- `INDEX idx_card_id (card_id)`

**说明**
- `rarity` 做快照存储，避免未来调整卡牌定义影响历史记录。

---

## 4.9 user_card_collection
用户卡牌收藏表，用于展示收藏册。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INT PK AI | 主键 |
| user_id | INT NOT NULL | 用户 ID |
| card_id | INT NOT NULL | 卡牌 ID |
| quantity | INT NOT NULL DEFAULT 0 | 持有数量 |
| created_at | DATETIME NOT NULL | 创建时间 |
| updated_at | DATETIME NOT NULL | 更新时间 |

**索引/约束**
- `UNIQUE KEY uniq_user_card (user_id, card_id)`
- `INDEX idx_user_id (user_id)`
- `INDEX idx_card_id (card_id)`

**说明**
- 收藏展示时优先查该表并关联 `card_catalog`。
- 如果只关心“是否拥有过”，也可以将 `quantity` 固定为 1；当前保留数量更灵活。

---

## 5. 推荐外键关系
P0 为了降低初期迁移复杂度，可先以 Prisma 管理关系；如果直接用 MySQL 建表，建议补齐以下外键：

- `couple_pairs.user_a_id -> users.id`
- `couple_pairs.user_b_id -> users.id`
- `invite_codes.creator_id -> users.id`
- `invite_codes.used_by_id -> users.id`
- `user_stats.user_id -> users.id`
- `checkin_records.user_id -> users.id`
- `checkin_records.task_id -> task_catalog.id`
- `draw_records.user_id -> users.id`
- `draw_records.card_id -> card_catalog.id`
- `user_card_collection.user_id -> users.id`
- `user_card_collection.card_id -> card_catalog.id`

---

## 6. 关键业务规则落库建议

### 6.1 登录
- 小程序端通过 `wx.login` 获取 `code`
- 服务端调用微信 `code2Session`
- 用 `openid` 查找 `users`
- 不存在则创建 `users` + `user_stats`

### 6.2 情侣绑定
- 用户 A 生成 `invite_codes`
- 用户 B 提交邀请码
- 服务端校验：
  1. 邀请码存在
  2. 邀请码未过期
  3. 邀请码未使用
  4. 双方都尚未绑定
- 校验通过后：
  - 写入 `couple_pairs`
  - 更新 `invite_codes.status = used`
  - 写入 `used_by_id`

### 6.3 打卡
- 校验任务是否有效 (`task_catalog.active = 1`)
- 写入 `checkin_records`
- 原子更新 `user_stats.total_hearts`
- 按奖励规则同步增加 `draw_chances`

### 6.4 抽卡
- 校验 `draw_chances > 0`
- 按卡池规则选中 `card_catalog`
- 写入 `draw_records`
- 更新 `user_card_collection.quantity`
- 原子扣减 `draw_chances`，增加 `total_draw_used`

---

## 7. 初始化顺序建议
1. 创建数据库 `romantic_collection`
2. 创建基础表
3. 初始化 `task_catalog`
4. 初始化 `card_catalog`
5. 接入 Prisma migration 或统一 SQL 初始化脚本

---

## 8. 当前文件对应关系
- Prisma 模型：`backend/prisma/schema.prisma`
- SQL 初始化脚本：`backend/sql/init.sql`
- 后端接口文档：`docs/development/api/backend-api-v1.md`
- 后端架构方案：`docs/development/architecture/2026-04-13-p0-backend-architecture.md`

---

## 9. 后续可扩展方向（P1/P2）
- 任务奖励规则表（不同任务奖励不同心意值/抽卡次数）
- 情侣共享空间表（共同成就、纪念日、留言）
- 活动卡池表（限定卡、节日卡）
- 成就系统表（解锁条件、奖励、展示状态）
- 用户操作日志表（审计与问题排查）
- 消息通知表（抽卡结果、对方完成互动提醒）

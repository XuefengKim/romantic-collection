# 我们的浪漫收藏本 - 微信小程序

情侣互动微信小程序，通过抽卡集卡的游戏化方式激励伴侣分担家务，增进感情。

## 当前版本定位

当前版本为 **本地缓存型 MVP**：
- 主闭环：任务打卡 → 心意累计 → 抽卡 → 收藏册
- 目标：验证“游戏化 + 浪漫惊喜”是否成立
- 当前不依赖服务端即可运行
- 已为未来接入服务器与线上数据库预留数据层与 API 层结构

## 项目结构

```
小程序/
├── app.js
├── app.json
├── app.wxss
├── config/                 # 环境开关、API 地址、功能开关
├── constants/              # 固定任务与固定卡池
├── repositories/           # 数据仓储层（本地 / 远端切换入口）
├── services/
│   ├── api/                # API Client，未来接服务端
│   └── statsService.js     # 业务逻辑层
├── utils/                  # Storage 等基础工具
├── pages/
│   ├── index/              # 首页（数据看板 + 打卡 + 抽卡）
│   └── collection/         # 收藏册页面
├── docs/
│   ├── README.md
│   ├── product/
│   │   ├── requirements/
│   │   ├── planning/
│   │   └── design/
│   └── development/
│       ├── architecture/
│       ├── api/
│       └── plans/
└── static/
```

## 已实现功能

1. **数据看板**：展示累计心意和待抽卡次数
2. **任务打卡**：6 个固定任务，单任务 60 秒冷却
3. **抽卡机制**：每累计 5 点心意获得 1 次抽卡机会
4. **盲盒抽卡**：6 张固定卡片，含 R/SR/SSR/UR 稀有度
5. **收藏册**：2 列网格展示，未收集显示问号
6. **成就彩蛋**：首次集齐全部卡片时显示满级成就弹窗
7. **本地缓存**：通过微信本地存储保存核心数据

## 技术基建说明

### 1. 分层结构
- **页面层**：负责视图展示和交互响应
- **服务层**：负责业务规则，如打卡、抽卡、成就判断
- **仓储层**：负责数据来源切换
- **API 层**：负责未来服务端请求

### 2. 为后端预留的接口点
- `config/env.js`：统一控制是否启用远端数据源
- `repositories/statsRepository.js`：未来替换为服务端读写
- `services/api/client.js`：统一封装 `wx.request`

### 3. 当前数据模型
```js
{
  totalHearts: 0,
  drawChances: 0,
  totalDrawEarned: 0,
  totalDrawUsed: 0,
  collectedCards: {},
  lastCheckin: {},
  meta: {
    fullCollectionAchievementShown: false
  }
}
```

其中：
- `totalDrawEarned`：累计获得抽卡机会
- `totalDrawUsed`：累计消耗抽卡机会
- `drawChances`：当前剩余抽卡次数

这比“按总心意和收集数反推”更适合未来接活动赠送、补发抽卡券、服务端同步。

## 开发与调试

1. 使用微信开发者工具打开项目目录
2. 当前项目 AppID：`wxa44320a7dbcd779e`
3. `project.config.json` 已完成该 AppID 配置
4. 若未来接服务端，先在 `config/env.js` 中配置 API 地址与开关
5. 本地调试时默认使用本地缓存数据源

## 后续建议方向

- 云端同步
- 双人协同与角色体系
- 自定义任务 / 卡池
- 消息提醒
- 排行榜 / 分享成就
- 图片记录与回忆沉淀

## Git 协作约定

- 仓库根目录：`/Users/mac/Desktop/小程序`
- 前端小程序、后端 `backend/`、以及 `docs/` 统一放在同一个 Git 仓库管理
- 不提交本地敏感配置与缓存文件：如 `backend/.env`、`backend/node_modules/`、`project.private.config.json`
- 主分支建议使用 `main`
- 功能开发建议使用分支：`feature/*`、`fix/*`、`docs/*`

## 文档

- 文档索引：`docs/README.md`
- 产品需求：`docs/product/requirements/PRD.md`
- 需求优先级：`docs/product/planning/需求优先级清单.md`
- 产品路线图：`docs/product/planning/产品路线图-roadmap.md`
- 设计说明：`docs/product/design/UIUX设计说明.md`
- 基建改造计划：`docs/development/plans/2026-04-13-miniprogram-foundation-refactor.md`
- P0 后端方案：`docs/development/architecture/2026-04-13-p0-backend-architecture.md`
- 后端 API：`docs/development/api/backend-api-v1.md`

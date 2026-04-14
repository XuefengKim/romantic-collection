# 微信小程序基建重构与可服务端接入改造计划

**目标**
- 修复当前 MVP 中已识别的技术基础问题
- 将“页面直连本地存储 + 业务逻辑散落页面”的结构，重构为“配置层 + 仓储层 + 服务层 + 页面层”
- 为未来接入服务器与线上数据库预留明确接口与切换点

## 本次改造范围
1. 新增配置层：统一管理环境开关、存储 key、API Base URL
2. 新增静态资源层：任务与卡池常量抽离
3. 新增本地存储工具层：统一 storage 操作
4. 新增 API Client：封装 wx.request，作为未来服务端接入口
5. 新增 Repository 层：
   - catalogRepository：任务/卡池读取
   - statsRepository：统计数据读写（默认 local，可切 remote）
6. 新增 Service 层：statsService 统一封装业务逻辑
7. 页面瘦身：首页/收藏页仅保留视图状态与交互编排
8. 修复基础问题：
   - collection.wxml 中未定义 collected 变量
   - 满级成就弹窗未持久化
   - drawChances 计算方式不利于未来扩展
   - README 与当前实现不一致

## 目标结构
- config/
- constants/
- utils/
- services/api/
- repositories/
- services/
- pages/

## 设计原则
- MVP 继续可本地运行
- 页面层只做展示和事件响应
- 业务规则集中到 service
- 数据来源切换集中到 repository
- 对未来云端化改造，优先预留“替换点”，不提前过度设计

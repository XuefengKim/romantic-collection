# 后端 API 文档（P0 / v1）

## 统一返回结构
```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

## 1. 微信登录
### POST /api/auth/wechat-login
请求：
```json
{ "code": "wx.login 返回的 code" }
```
返回：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "token": "***",
    "user": {
      "id": 1,
      "openid": "***",
      "nickname": null,
      "avatarUrl": null
    },
    "pairStatus": "unbound"
  }
}
```

## 2. 获取当前用户信息
### GET /api/auth/me
Header:
- Authorization: Bearer ***

## 3. 生成邀请码
### POST /api/couple/invite-code
Header:
- Authorization: Bearer ***

返回邀请码和过期时间。

## 4. 绑定情侣关系
### POST /api/couple/bind
Header:
- Authorization: Bearer ***
请求：
```json
{ "inviteCode": "ABCD1234" }
```

## 5. 取消绑定
### POST /api/couple/unbind
Header:
- Authorization: Bearer ***

说明：
- 解除当前两位用户之间的绑定关系
- 删除双方当前关系下的所有玩法数据
- 返回未绑定状态

成功返回：
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

失败示例：
- 当前未绑定：`409 当前未绑定，无需取消绑定`

## 6. 首页状态
### GET /api/home/state
Header:
- Authorization: Bearer ***

返回：心意值、抽卡次数、任务配置、绑定状态。

说明：
- 该接口可用于前端判断当前是否已绑定
- 即使用户未绑定，也会返回 `pairStatus` 供前端跳转决策

## 7. 提交打卡
### POST /api/home/checkin
Header:
- Authorization: Bearer ***
请求：
```json
{ "taskId": 1 }
```

说明：
- 仅已绑定用户可调用
- 未绑定用户调用时返回 403

## 8. 抽卡
### POST /api/home/draw
Header:
- Authorization: Bearer ***

说明：
- 仅已绑定用户可调用
- 未绑定用户调用时返回 403

## 9. 获取收藏册
### GET /api/collection
Header:
- Authorization: Bearer ***

说明：
- 仅已绑定用户可调用
- 未绑定用户调用时返回 403

## 10. 记录“满收藏成就弹窗已展示”
### POST /api/collection/achievement/full-collection/viewed
Header:
- Authorization: Bearer ***

说明：
- 仅已绑定用户可调用
- 未绑定用户调用时返回 403

返回：
```json
{
  "code": 0,
  "message": "已记录成就弹窗状态",
  "data": {
    "fullCollectionAchievementShown": true
  }
}
```

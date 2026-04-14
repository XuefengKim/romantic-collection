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
    "token": "session token",
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
### GET /api/me
Header:
- Authorization: Bearer <token>

## 3. 生成邀请码
### POST /api/couple/invite-code
Header:
- Authorization: Bearer <token>

返回邀请码和过期时间。

## 4. 绑定情侣关系
### POST /api/couple/bind
Header:
- Authorization: Bearer <token>
请求：
```json
{ "inviteCode": "ABCD1234" }
```

## 5. 首页状态
### GET /api/home/state
Header:
- Authorization: Bearer <token>
返回：心意值、抽卡次数、任务配置、绑定状态。

## 6. 提交打卡
### POST /api/checkin
Header:
- Authorization: Bearer <token>
请求：
```json
{ "taskId": 1 }
```

## 7. 抽卡
### POST /api/draw
Header:
- Authorization: Bearer <token>

## 8. 获取收藏册
### GET /api/collection
Header:
- Authorization: Bearer <token>

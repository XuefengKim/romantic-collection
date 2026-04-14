const express = require('express')
const authController = require('../controllers/authController')
const auth = require('../middlewares/auth')

const router = express.Router()

router.post('/wechat-login', authController.wechatLogin)
router.get('/me', auth, authController.me)

module.exports = router

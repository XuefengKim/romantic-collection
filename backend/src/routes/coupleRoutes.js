const express = require('express')
const coupleController = require('../controllers/coupleController')
const auth = require('../middlewares/auth')

const router = express.Router()

router.post('/invite-code', auth, coupleController.createInviteCode)
router.post('/bind', auth, coupleController.bindCouple)

module.exports = router

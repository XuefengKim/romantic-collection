const express = require('express')
const homeController = require('../controllers/homeController')
const auth = require('../middlewares/auth')

const router = express.Router()

router.get('/state', auth, homeController.getHomeState)
router.post('/checkin', auth, homeController.checkin)
router.post('/draw', auth, homeController.draw)

module.exports = router

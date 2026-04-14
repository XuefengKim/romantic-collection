const express = require('express')
const collectionController = require('../controllers/collectionController')
const auth = require('../middlewares/auth')

const router = express.Router()

router.get('/', auth, collectionController.getCollection)
router.post('/achievement/full-collection/viewed', auth, collectionController.markFullAchievementViewed)

module.exports = router

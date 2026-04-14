const express = require('express')
const collectionController = require('../controllers/collectionController')
const auth = require('../middlewares/auth')

const router = express.Router()

router.get('/', auth, collectionController.getCollection)

module.exports = router

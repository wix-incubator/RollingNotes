var express = require('express');
var router = express.Router();
var auth = require('../authenticate');;

/* GET home page. */
router.get('/', function(req, res) {
  console.log('testing');
//  auth.authenticate(req, res);
  console.log('testing');
//  res.sendfile('./views/helloworld.html');
});

module.exports = router;

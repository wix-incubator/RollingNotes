var express = require('express');
var router = express.Router();
var auth = require('../authenticate');;

/* GET home page. */
router.get('/', function(req, res) {

    //view
    res.sendfile('./views/helloworld.html');

});

/* GET widget. */
router.get('/widget', function(req, res) {
    //widget authentication
    auth.authenticate(req, res);

    //view
    res.sendfile('./views/helloworld.html');

});

/* GET settings. */
router.get('/settings', function(req, res) {
    //settings authentication
    auth.authenticate(req, res);

    //view
    res.sendfile('./views/helloworld.html');

});

module.exports = router;

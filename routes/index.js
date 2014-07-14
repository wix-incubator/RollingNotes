var express = require('express');
var db = require('../data/database');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {

    //view
    res.sendfile('./views/helloworld.html');

});

/* GET widget. */
router.get('/widget', function(req, res) {
    console.log("you loaded the widget");
    res.sendfile('./views/widget.html');


});

/* GET settings. */
router.get('/settings', function(req, res) {
    console.log("you loaded the settings");
    // get db key
    var key = getKey(req);
    // get settings object from db based on key
    db.getSettings(key, function (settings) {
        console.log(JSON.stringify(settings));
    });

    // load
    res.sendfile('./views/settings.html');
});

module.exports = router;


function getKey(req) {
    return req.instanceId  + req.compId;
}
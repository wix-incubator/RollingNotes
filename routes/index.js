var express = require('express');
var db = require('../data/database');
var router = express.Router();

/* GET widget. */
router.get('/widget', function(req, res) {
    var key = req.instanceId  + '.' + req.compId;
    // get settings object from db based on key
    db.getCompByKey(key, function (data) {
        console.log('Data: ' + JSON.stringify(data));
        res.render('widget.ejs', { settings:  JSON.stringify(data)});
    });
});

/* GET settings. */
router.get('/settings', function(req, res) {
    // get db key
    var key = req.instanceId  + '.' + req.origCompId;
    // get settings object from db based on key
    db.getCompByKey(key, function (data) {
        res.render('settings.ejs', { settings:  JSON.stringify(data)});
    });
});

/* Update component. */
router.post('/updateComponent', function(req, res) {
    db.updateComponent(req.body);
});

module.exports = router;
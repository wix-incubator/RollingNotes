var express = require('express');
var db = require('../data/database');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {

    //view
//    res.render('widget', {title: 'Homepage!'});

});

/* GET widget. */
router.get('/widget', function(req, res) {
    console.log("you loaded the widget");
    res.render('widget.ejs', {title: 'The notes widget!'});


});

/* GET settings. */
router.get('/settings', function(req, res) {
    console.log("you loaded the settings");
    // get db key
    var key = getKey(req);
    // get settings object from db based on key
    db.getCompByKey(key, function (settings) {
        console.log(JSON.stringify(settings));
    });

    // load
    res.render('settings.ejs', { title: 'The settings page!' })
});

/* Update component. */
router.post('/updateComponent', function(req, res) {
    console.log('Posting component updates.');

    //db.updateComponent();
});

function getKey(req) {
    return req.instanceId  + req.compId;
}

module.exports = router;
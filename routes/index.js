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
    db.getCompByKey(key, function (data) {
        console.log("Returning settings to angular: " + JSON.stringify(data));
        res.render('settings.ejs', { settings:  JSON.stringify(data)});
    });

    // load
//    res.render('settings.ejs', { settings:  })
});

/* Update component. */
router.post('/updateComponent', function(req, res) {
    var body = "";
    console.log(req.body);
    db.updateComponent(req.body);
});

function getKey(req) {
    return req.instanceId  + req.origCompId;
}

module.exports = router;
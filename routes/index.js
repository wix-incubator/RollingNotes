var express = require('express');
var db = require('../data/database');
var auth = require('../authenticate');
var router = express.Router();

function handleRequest(req, res, compId, template) {
    var key = req.instanceId  + '.' + compId;
    // get settings object from db based on key
    db.getCompByKey(key).then(function (data) {
        console.log('Data: ' + JSON.stringify(data));
        res.render(template, { settings:  JSON.stringify(data)});
    });
}

/* GET widget. */
router.get('/widget', function(req, res) {
    handleRequest(req, res, req.compId, 'widget.ejs');
});

/* GET settings. */
router.get('/settings', function(req, res) {
    handleRequest(req, res, req.origCompId, 'settings.ejs');

});


/* Update component. */
router.post('/updateComponent', function(req, res) {
    if(req.body.instance) {
        req.query.instance = req.body.instance
        auth.authenticate(req, res);
        db.updateComponent(req.body);
    } else {
        console.log('Authentication Error. Did not post to database.')
    }
});

module.exports = router;
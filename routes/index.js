var express = require('express');
var db = require('../data/database');
var auth = require('../authenticate');
var router = express.Router();

/**
 * Handles GET requests for widget and settings.
 * Grabs widget data from the database via unique id and sends
 * to specified view.
 *
 * @param req - GET request
 * @param res - GET response
 * @param compId - unique widget id
 * @param template - either 'widget.ejs' or 'settings.ejs'
 */

function handleRequest(req, res, compId, template) {
    var key = req.instanceId  + '.' + compId;
    // get settings object from db based on key
    db.getCompByKey(key).then(function (data) {
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


/**
 *  POST request that updates database with new
 *  widget data.
 *
 *  Request must hold proper instance id for the request
 *  to be properly authenticated and saved to the database.
 *
 *  This is to avoid unauthorized access to the database.
 **/
router.post('/updateComponent', function(req, res) {
        req.query.instance = req.body.instance
        auth.authenticate(req, res);
        db.updateComponent(req.body);
});

module.exports = router;
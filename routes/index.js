var express = require('express');
var db = require('../data/database');
var formidable = require('formidable');
var sys = require('sys');
var auth = require('../authenticate');
var router = express.Router();

/* GET widget. */
router.get('/widget', function(req, res) {
    auth.authenticate(req,res);
    var key = req.instanceId  + '.' + req.compId;
    // get settings object from db based on key
    db.getCompByKey(key).then(function(data) {
        console.log('Data: ' + JSON.stringify(data));
        res.render('widget.ejs', { settings:  JSON.stringify(data)});
    });
});

/* GET settings. */
router.get('/settings', function(req, res) {
    // get db key
    auth.authenticate(req,res);
    var key = req.instanceId  + '.' + req.origCompId;
    // get settings object from db based on key
    db.getCompByKey(key).then(function(data) {
        res.render('settings.ejs', { settings:  JSON.stringify(data)});
    });
});

/* Update component. */
router.post('/updateComponent', function(req, res) {
    auth.authenticate(req,res);
    db.updateComponent(req.body);
});

/* Upload file */
router.post('/upload', function(req, res) {
    console.log('upload post!');
//    var form = new formidable.IncomingForm(); form.parse(req, function(error, fields, files) {
////        res.writeHead(200, {'content-type': 'text/plain'});
////        res.write('received upload:\n\n');
//        res.end(sys.inspect({fields: fields, files: files}));
//    });
//    return;
});

module.exports = router;
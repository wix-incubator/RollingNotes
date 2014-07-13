/**
 * Created by elanas on 7/13/14.
 */
var express = require('express');
var app = express();
var wix = require('openapi-node');

var APP_SECRET = '274cac4b-5816-46a5-b9e6-c9c04c52c46e';
var APP_ID = '137f851f-ed9d-9e85-4e0a-b73bc11455e4';

// The route should match the app endpoint set during registration
app.get('/widget', function (req, res) {

    // The GET request to your app endpoint will contain an instance parameter for you to parse
    var instance = req.query.instance;

    var title = 'Home - Not Verified';

    try {
        // Parse the instance parameter
        var wixInstance = wix.getConnect();
        var wixParse = wixInstance.parseInstance(instance, APP_SECRET);

        var instanceId = wixParse.instanceId;

        // Get a shortcut for the Wix RESTful API
        var wixAPI = wix.getAPI(APP_SECRET, APP_ID, instanceId);

        console.log("Once you've reached this point you're good to use the Wix API, otherwise an exception will be thrown.");

        title = 'Home - instance verified';
//        res.send( title );
        res.render('helloworld.ejs');

    } catch(e) {
        console.log(e);
        title = "Wix API init failed. Check your app key, secret and instance Id";
        console.log( title );
        res.send( title );
    }
});

app.get('/', function(req, res) {
    res.render('helloworld.ejs');
});

app.get('/settings', function (req, res) {
//    // The GET request to your app endpoint will contain an instance parameter for you to parse
//    var instance = req.query.instance;
//
//    var title = 'Home - Not Verified';
//
//    try {
//        // Parse the instance parameter
//        var wixInstance = wix.getConnect();
//        var wixParse = wixInstance.parseInstance(instance, APP_SECRET);
//
//        var instanceId = wixParse.instanceId;
//
//        // Get a shortcut for the Wix RESTful API
//        var wixAPI = wix.getAPI(APP_SECRET, APP_ID, instanceId);
//
//        console.log("Once you've reached this point you're good to use the Wix API, otherwise an exception will be thrown.");
//
//
//        title = 'Home - instance verified';
//        res.send( title );
//
//    } catch(e) {
//        console.log(e);
//        title = "Wix API init failed. Check your app key, secret and instance Id";
//        console.log( title );
//        res.send( title );
//    }
});

app.listen(8000);
/**
 * Created by elanas on 7/13/14.
 */
var express = require('express');
var app = express();
var wix = require('openapi-node');

var APP_SECRET = '274cac4b-5816-46a5-b9e6-c9c04c52c46e';
var APP_ID = '137f851f-ed9d-9e85-4e0a-b73bc11455e4';

function authenticate(req, res) {
    var instance = req.query.instance;
    try {
        // Parse the instance parameter
        var wixInstance = wix.getConnect();
        var wixParse = wixInstance.parseInstance(instance, APP_SECRET);

        var instanceId = wixParse.instanceId;

        // Get a shortcut for the Wix RESTful API
        var wixAPI = wix.getAPI(APP_SECRET, APP_ID, instanceId);

        console.log("Once you've reached this point you're good to use the Wix API, otherwise an exception will be thrown.");

        title = 'Home - instance verified';

        console.log('Authentication Succesful');

    } catch(e) {
        console.log(e);
        title = "Wix API init failed. Check your app key, secret and instance Id";
        console.log( title );
        res.send( title );
    }
}

// The route should match the app endpoint set during registration
app.get('/widget', function (req, res) {

    // The GET request to your app endpoint will contain an instance parameter for you to parse
    var title = 'Home - Not Verified';
    authenticate(req, res);
    res.sendfile('./views/helloworld.html');

});

//app.get('/', function(req, res) {
////    res.render('helloworld.ejs');
//     res.sendfile('./views/helloworld.html');
//});

app.get('/settings', function (req, res) {
    // The GET request to your app endpoint will contain an instance parameter for you to parse
    authenticate(req, res);
    var title = 'Home - Not Verified';
    res.sendfile('./views/helloworld.html');

});

app.listen(8000);
exports.auth = authenticate;
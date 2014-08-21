/***************************************************************
 * WIX APP AUTHENTICATION
 *
 * Used to authenticate each url request as a Wix request.
 * Uses openapi-node library provided by Wix.
 * Required for all requests to and from Wix.
 ***************************************************************/
var express = require('express');
var app = express();
var wix = require('openapi-node');

//heroku
//var APP_SECRET = '274cac4b-5816-46a5-b9e6-c9c04c52c46e';
//var APP_ID = '137f851f-ed9d-9e85-4e0a-b73bc11455e4';
////local
var APP_SECRET = '8ede2ed1-9961-4b3c-9bf9-a154eee00ddb';
var APP_ID = '138a0642-8449-ff5d-546a-445737e36967';

/**
 * Exports the authenticate function to be used as middleware
 * in between every server request made by the Rolling Notes Settings
 * or Widget endpoint.
 *
 * @param req - server request
 * @param res - server response
 */
exports.authenticate = function authenticate(req, res) {
    var instance = req.query.instance;

    try {
        /* Parse the instance parameter */
        var wixInstance = wix.getConnect();
        var wixParse = wixInstance.parseInstance(instance, APP_SECRET, function(date) {
            return true;
        });

        var instanceId = wixParse.instanceId;

        /* Get a shortcut for the Wix RESTful API */
        wixAPI = wix.getAPI(APP_SECRET, APP_ID, instanceId);

        console.log("Once you've reached this point you're good to use the Wix API, otherwise an exception will be thrown.");

        console.log('Authentication Successful');

        /* save instanceId and compId in request to be used in routes/index.js*/
        req.instanceId = instanceId;
        req.compId = req.query.compId;
        req.origCompId = req.query.origCompId;
    } catch(e) {
        console.log(e);
        title = "Wix API init failed. Check your app key, secret and instance Id";
        console.log( title );
        res.send( title );

    }
}
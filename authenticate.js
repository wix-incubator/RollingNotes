/****************************
 * Used to authenticate each url request as a Wix request
 * Uses openapi-node library provided by Wix
 * Required for all requests to and from Wix
 *****************************/
var express = require('express');
var app = express();
var wix = require('openapi-node');

var APP_SECRET = '8ede2ed1-9961-4b3c-9bf9-a154eee00ddb';
var APP_ID = '138a0642-8449-ff5d-546a-445737e36967';

exports.authenticate = function authenticate(req, res) {
    var instance = req.query.instance;

    try {
        // Parse the instance parameter
        var wixInstance = wix.getConnect();
        var wixParse = wixInstance.parseInstance(instance, APP_SECRET, function(date) {
            return true;
        });

        var instanceId = wixParse.instanceId;

        // Get a shortcut for the Wix RESTful API
        wixAPI = wix.getAPI(APP_SECRET, APP_ID, instanceId);

        console.log("Once you've reached this point you're good to use the Wix API, otherwise an exception will be thrown.");

        title = 'Home - instance verified';

        console.log('Authentication Successful');

        // save instanceId and compId in request
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
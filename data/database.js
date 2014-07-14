/**
 * Created by Adam_Cole on 7/13/14.
 *
 *
 *
 */

// require database files
var mongojs = require("mongojs");
var db = mongojs("db",["rollingnotes"]);
// require default JSON objects for new instances   
var defaults = require("./defaults");

//inserts new widget instance or loads existing one
function getSettings(uniqueid, callback) {
    db.rollingnotes.findOne({_id: uniqueid}, function(err, doc) {
        var settings;
        if(err || !doc) {
            console.log('Settings Doc did not exist, was created and returned');
            settings = defaults.settings;
            settings._id = uniqueid;
            db.rollingnotes.insert(settings);
        } else {
            console.log('Settings Doc existed and returned');
            settings = doc;
        }
        callback(settings);
    });
};

// TODO: write function that sends settings to UI/css
function printSettings(settings) {
    console.log("PRINT SETTINGS: " + JSON.stringify(settings));
};

// TODO: replicate for widget endpoint

// for testing purposes
function loadDB() {
 //  db.rollingnotes.remove();
//    db.rollingnotes.insert({'test': '2'});
//    db.rollingnotes.insert({'test': '3'});
//    db.rollingnotes.insert({'test': '4'});
}

loadDB();
getSettings("6", printSettings);

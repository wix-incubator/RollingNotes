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
function getSettings(key, callback) {
    // search for instance of setting in databse by unique key
    db.rollingnotes.findOne({_id: key}, function(err, doc) {
        var settings;
        if(err || !doc) {
            console.log('Settings Doc did not exist, was created and returned');
            // if doc doesn't exist, assign default settings and unique key
            settings = defaults.settings;
            settings._id = key;
            // insert new settings instance in db
            db.rollingnotes.insert(settings);
        } else {
            // if doc exists, assign existing setting
            console.log('Settings Doc existed and returned');
            settings = doc;
        }
        // do something with settings object
        callback(settings);
    });
};

function updateSettings(updatedSettings, callback) {
    db.rollingnotes.save(updatedSettings, function(err, data) {
        if (err)  {
            console.log("err while updating settings");
        } else {
            if (callback && typeof(callback) == "function") callback(data); //should update widget ui
        }
    });
    console.log("update didn't crash");
}

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


var updateSettingsTest = {
    "_id" : "1380ce7a-023d-46b3-0248-66b7f44b0bd7hxlx65qa",
    "test" : "we changed the settings"
}

updateSettings(updateSettingsTest);


exports.getSettings = getSettings;
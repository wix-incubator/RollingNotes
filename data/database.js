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
function getCompByKey(key, callback) {
    // search for instance of setting in databse by unique key
    db.rollingnotes.findOne({_id: key}, function(err, doc) {
        var comp;
        if(err || !doc) {
            console.log('Component did not exist, was created and returned');
            // if doc doesn't exist, assign default component
            comp = defaults.component;
            // assign new component unique key
            comp._id = key;
            // insert new comp instance in db
            db.rollingnotes.insert(comp);
        } else {
            // if doc exists, assign existing setting
            console.log('Comp Doc existed and returned');
            comp = doc;
        }
        // do something with comp object
        callback(comp);
    });
};

function updateCompByKey(updatedComp, callback) {
    db.rollingnotes.save(updatedComp, function(err, data) {
        if (err)  {
            console.log("err while updating comp");
        } else {
            if (callback && typeof(callback) == "function") callback(data); //should update widget ui
        }
    });
    console.log("update didn't crash");
}

// for testing purposes
function loadDB() {
 //  db.rollingnotes.remove();
//    db.rollingnotes.insert({'test': '2'});
//    db.rollingnotes.insert({'test': '3'});
//    db.rollingnotes.insert({'test': '4'});
}


var updateCompTest = {
    "_id" : "1380ce7a-023d-46b3-0248-66b7f44b0bd7hxlx65qa",
    "test" : "we changed the comp"
}

updateCompByKey(updateCompTest);


exports.getCompByKey = getCompByKey;
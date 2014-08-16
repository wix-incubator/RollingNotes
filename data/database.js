/**************************
 * Rolling Notes database using mongoDB to save note settings
 **************************/

var pmongo = require('promised-mongo');

// require database files
//var mongojs = require('mongojs');
var mongoUri = process.env.MONGOLAB_URI ||
    process.env.MONGOHQ_URL ||
    'mongodb://localhost/db';

var collections = ["rollingnotes"]
//var db = mongojs.connect(mongoUri, collections);
var db = pmongo.connect(mongoUri, collections);



// require default JSON objects for new instances
var templates = require("../public/javascripts/defaultTemplates");

//TODO add input validation on key and callback
//TODO PROMISES, not callbacks

//inserts new widget instance or loads existing one
function getCompByKey(key, callback) {
    // search for instance of setting in databse by unique key
    //TODO what should happen on errors? why insert something?
    //TODO what happens if doc doesn't exist?
    db.rollingnotes.findOne({_id: key}, function(err, doc) {
        var comp;
        if(err || !doc) {
            console.log('Component did not exist, was created and returned');
            // if doc doesn't exist, assign default component
            comp = templates.defaultNote;
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


//TODO change this to use promises
function updateComponent(updatedComp) {
    db.rollingnotes.save(updatedComp, function(err, data) {
        if (err)  {
            console.log(err);
        } else {
                console.log('worked');
        }
    });
    console.log("update didn't crash");
}

exports.getCompByKey = getCompByKey;
exports.updateComponent = updateComponent;
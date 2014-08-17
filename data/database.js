/**************************
 * Rolling Notes database using mongoDB to save note settings
 **************************/
var q = require('q');
var pmongo = require('promised-mongo');

// require database files
var mongoUri = process.env.MONGOLAB_URI ||
    process.env.MONGOHQ_URL ||
    'mongodb://localhost/db';

var collections = ["rollingnotes"]
var db = pmongo.connect(mongoUri, collections);


// require default JSON objects for new instances
var templates = require("../public/javascripts/defaultTemplates");

//TODO add input validation on key and callback

//inserts new widget instance or loads existing one
function getCompByKey(key) {
    var deferred = q.defer();
    return db.rollingnotes.findOne({_id: key
    }).then(function(doc) {
        var comp;
        if(!doc) {
            comp = templates.defaultNote;

            // assign new component unique key
            comp._id = key;

            // insert new comp instance in db
            db.rollingnotes.insert(comp).then(function(comp) {
                "use strict";
                deferred.resolve(comp);
            });

        } else {
            console.log('Comp Doc existed and returned');
            comp = doc;
            deferred.resolve(comp);
        }
        return deferred.promise;
    }, function(err) {
        console.log('Error in getCompByKey')
        deferred.reject(err);
    });
};

function updateComponent(updatedComp) {
    db.rollingnotes.save(updatedComp).then(function(data) {
            console.log('db successfully updated')
    }, function(err) {
        console.log('Error: ' + err);
    });
}

exports.getCompByKey = getCompByKey;
exports.updateComponent = updateComponent;

/********************************************************************
 * ROLLING NOTES DATABASE
 *
 * MongoDB used to store note data.
 * Uses 'q' and 'pmongo' node-modules to make use of promises instead of callbacks.
 *
 * Each note instance stored with unique id: (Wix site instance + Wix component id).
 * Each note stored as JSON object in database.
 *
 ********************************************************************/


/* Grabbing node-modules */
var q = require('q');
var pmongo = require('promised-mongo');

/* Configuring MongoDb entrypoint */
var mongoUri = process.env.MONGOLAB_URI ||
    process.env.MONGOHQ_URL ||
    'mongodb://localhost/db';

/*
 * Creating rollingnotes collection.
 * This will be where all note data is stored.
 */
var collections = ["rollingnotes"]
var db = pmongo.connect(mongoUri, collections);


/*
 * Grabbing default note settings.
 * This is used when a new note is added to the database.
 */
var defaultNote = require("../public/javascripts/defaultTemplates").defaultNote;

/**
 * Inserts new note instance if no note exists in database.
 * Loads existing note instance if note already saved.
 * Note is stored with unique id: (site instance id + comp id)
 *
 * Uses promises instead of callbacks.
 *
 * @param key - unique id to reference note in db
 * @returns - note-component data in JSON form
 */
function getCompByKey(key) {
    var deferred = q.defer();
    return db.rollingnotes.findOne({_id: key
    }).then(function(doc) {
        var comp;
        if(!doc) {
            comp = defaultNote.defaultNote;

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

/**
 * Updates database with updated note-component.
 * Uses 'updatedComp.id' to find note to update.
 * Sets old note to 'updatedComp'.
 *
 * Uses promise instead of callback.
 *
 * @param updatedComp - updated note-component to be saved in db.
 */
function updateComponent(updatedComp) {
    db.rollingnotes.save(updatedComp).then(function(data) {
            console.log('db successfully updated')
    }, function(err) {
        console.log('Error: ' + err);
    });
}

/* Exporting functions to be used in routes/index.js for saving data */
exports.getCompByKey = getCompByKey;
exports.updateComponent = updateComponent;
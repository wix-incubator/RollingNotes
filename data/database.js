
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
    }).then(function(note) {
        var comp;

        /* if note does not exist in db */
        if(!note) {

            /* sets new note settings to default */
            comp = defaultNote.defaultNote;

            /* assigns new note unique key */
            comp._id = key;

            /* inserts new note in db */
            db.rollingnotes.insert(comp).then(function(comp) {
                deferred.resolve(comp);
            });

        /* if note already exists in db */
        } else {
            console.log('Comp Doc existed and returned');

            /* loads note */
            comp = note;
            deferred.resolve(comp);
        }

        /* returns note */
        return deferred.promise;

    }, function(err) {
        /* called if error in database */
        console.log('Error in getCompByKey')
        deferred.reject(err);
    });
};

/**
 * Updates database with updated note-component.
 * Uses 'updatedNote.id' to find note to update.
 * Sets old note to 'updatedNote'.
 *
 * Uses promise instead of callback.
 *
 * @param updatedNote - updated note-component to be saved in db.
 */
function updateComponent(updatedNote) {
    /* updates database with new note data */
    db.rollingnotes.save(updatedNote).then(function(data) {
            console.log('db successfully updated')
    }, function(err) {
        console.log('Error: ' + err);
    });
}

/* Exporting functions to be used in routes/index.js for saving data */
exports.getCompByKey = getCompByKey;
exports.updateComponent = updateComponent;
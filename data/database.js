
/********************************************************************
 * ROLLING NOTES DATABASE
 *
 * MongoDB used to store note data.
 * Uses 'q' and 'pmongo' node-modules to make use of promises instead of callbacks.
 *
 * Each widget instance stored with unique id: (Wix site instance + Wix component id).
 * Each widget instance stored as JSON object in database.
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
 * Grabbing initial widget settings.
 * This is used when a new widget is created and added to the database.
 */
var defaultNote = require("../public/javascripts/defaultTemplates").defaultNote;

/**
 * Inserts new widget instance if none exists in database.
 * Loads existing widget settings if already saved id db.
 * Widget is stored with unique id: (site instance id + comp id)
 *
 * Uses promises instead of callbacks.
 *
 * @param key - unique id to reference widget in db
 * @returns - widget data in JSON form
 */
function getCompByKey(key) {
    var deferred = q.defer();
    return db.rollingnotes.findOne({_id: key
    }).then(function(widget) {
        var comp;

        /* if widget does not exist in db */
        if(!widget) {

            /* sets new widget settings to default */
            comp = defaultNote.defaultNote;

            /* assigns new widget unique key */
            comp._id = key;

            /* inserts new note in db */
            db.rollingnotes.insert(comp).then(function(comp) {
                deferred.resolve(comp);
            });

        /* if widget already exists in db */
        } else {
            console.log('Widget existed and returned');

            /* loads note */
            comp = widget;
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
 * Updates database with updated widget data.
 * Uses 'updatedWidget.id' to find note to update.
 * Sets old note to 'updatedWidget'.
 *
 * Uses promise instead of callback.
 *
 * @param updatedWidget - updated widget to be saved in db.
 */
function updateComponent(updatedWidget) {
    /* updates database with new note data */
    db.rollingnotes.save(updatedWidget).then(function(data) {
            console.log('db successfully updated')
    }, function(err) {
        console.log('Error: ' + err);
    });
}

/* Exporting functions to be used in routes/index.js for saving data */
exports.getCompByKey = getCompByKey;
exports.updateComponent = updateComponent;
/**
 * Created by Adam_Cole on 7/13/14.
 *
 *
 *
 */
// require database files
var mongojs = require("mongojs");
var db = mongojs("db",["rollingnotes"]).rollingnotes;


//inserts a new widget instance
function insertComponent(id) {
    db.insert()
}


//inserts a new note in existing widget




//db.rollingnotes.find({'test':'success'}, function(err, user){
//    console.log(user[3]);
//})


//console.log(db.rollingnotes.find(function (err, docs){
//    console.log(docs);
//}));

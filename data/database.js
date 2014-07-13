/**
 * Created by Adam_Cole on 7/13/14.
 */
// require database files
var mongojs = require("mongojs");
var db = mongojs("db",["rollingnotes"]);
db.rollingnotes.insert({"test" : "success"});
console.log(db.rollingnotes.find(function (err, docs){
    console.log(docs);
}));

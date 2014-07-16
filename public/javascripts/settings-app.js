/**
 * Created by elanas on 7/16/14.
 */

(function(){
   var app = angular.module("settingsApp", []);

   app.controller('settingsController', function() {
        this.test = "Hi Adam";
       this.testing = function() {
             console.log('angular is working!!!!!!!!!!!!!!!!!!!!!!!!');
         };
   });

})();

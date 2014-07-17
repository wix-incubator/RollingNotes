/**
 * Created by elanas on 7/16/14.
 */

(function(){
    var app = angular.module("settingsApp", []);

    app.controller('settingsController', ['$window', '$scope', '$http', function($window, $scope, $http) {
        this.settings = $window.settings;

        this.getSettings = function(settings) {
            console.log(settings);
        };

        var parseCompId = function(key){
            return key.substring(key.indexOf(".") + 1);
        }

        this.updateComponent = function() {
            $http.post('/updateComponent', this.settings).success(function() {
                ;
                //may need to add a .failure(function) method
                var compId = parseCompId(settings._id);
                Wix.Settings.refreshAppByCompIds([compId]);
                console.log('the callback has callbacked!')
            });
        };


    }]);

})();

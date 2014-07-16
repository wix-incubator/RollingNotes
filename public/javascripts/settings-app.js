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

        this.updateComponent = function() {
            $http.post('/updateComponent', this.settings);
        };

    }]);

})();

/**
 * Created by elanas on 7/16/14.
 */

(function(){
    var app = angular.module("settingsApp", []);

    app.controller('settingsController', ['$window', '$scope', function($window, $scope) {
        this.settings = $window.settings;

            this.test = "Hi Adam";
        this.testing = function() {

            console.log(this.settings);

        };

        this.getSettings = function(settings) {
            console.log(settings);
        };
    }]);

})();

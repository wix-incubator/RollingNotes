/**
 * Created by elanas on 7/16/14.
 */

(function(){
    var app = angular.module("settingsApp", ['ui.sortable']);

    app.controller('settingsController', ['$window', '$scope', '$http', function($window, $scope, $http) {
        this.settings = $window.settings;

        this.getSettings = function(settings) {
            console.log(settings);
        };

        var parseCompId = function(key){
            return key.substring(key.indexOf(".") + 1);
        }

        var updateComponent = function(newSettings) {
              this.settings = newSettings;
//            if (key === "template") settings.template = newSettings.value;
//            if (key === "radius") settings.radius = newSettings;
//            if (key === "borderWidth")  settings.borderWidth= newSettings;
//            settings.template = 'postit-note';
//            Wix.Settings.triggerSettingsUpdatedEvent(settings, parseCompId(settings._id));

            $http.post('/updateComponent', this.settings).success(function() {
                console.log('posting');
                //may need to add a .failure(function) method
//                var compId = parseCompId(settings._id);
//                Wix.Settings.refreshAppByCompIds([compId]);
            }).error(function(data, status, headers, config) {
                 console.log("OH NO! WE FAILED TO POST!!!!!");
                 console.log("data: " + data + "; status: " + status);
            });

            Wix.Settings.triggerSettingsUpdatedEvent(settings, parseCompId(settings._id));
        };

        this.showManageNotes = function() {
            $('#manage-notes').removeClass('hidden-manage-notes');
        };

        this.hideManageNotes = function() {
            $('#manage-notes').addClass('hidden-manage-notes');
        };

        this.resetTemplate = function() {
            console.log('resetTemplate');
        };

//
//        //for wix-model widget updates
//        Wix.UI.onChange('*', function(settings, key){
////            Wix.Settings.triggerSettingsUpdatedEvent(key, parseCompId(settings._id));
//            console.log(JSON.stringify(settings));
//            updateComponent(settings, key);
//        });

        Wix.UI.onChange('template', function(newSettings){
            settings.template = newSettings.value;
            updateComponent(settings);
        });

        Wix.UI.onChange('radius', function(newSettings){
            settings.radius = newSettings;
            updateComponent(settings);
        });

        Wix.UI.onChange('borderWidth', function(newSettings){
            settings.borderWidth= newSettings;
            updateComponent(settings);
        });

//        this.printStyles = function() {
//            Wix.Styles.getStyleParams( function(styleParams) {
//                // do something with the style params
//                console.log('Styles: ' + styleParams);
//            });
//        };

    }]);

})();

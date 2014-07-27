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

        var updateComponent = function(value,key) {
              settings.template = value;
//            settings.template = 'postit-note';
//            Wix.Settings.triggerSettingsUpdatedEvent(settings, parseCompId(settings._id));

            $http.post('/updateComponent', this.settings).success(function() {
                console.log('posting');
                //may need to add a .failure(function) method
//                var compId = parseCompId(settings._id);
//                Wix.Settings.refreshAppByCompIds([compId]);
                Wix.Settings.triggerSettingsUpdatedEvent(settings, parseCompId(settings._id));
            });
        };

        this.showManageNotes = function() {
            $('#manage-notes').removeClass('hidden-manage-notes');
        };

        this.hideManageNotes = function() {
            $('#manage-notes').addClass('hidden-manage-notes');
        };


        //for wix-model widget updates
        Wix.UI.onChange('*', function(settings, key){
//            Wix.Settings.triggerSettingsUpdatedEvent(key, parseCompId(settings._id));
            updateComponent(settings.value, key);
        });

//        this.printStyles = function() {
//            Wix.Styles.getStyleParams( function(styleParams) {
//                // do something with the style params
//                console.log('Styles: ' + styleParams);
//            });
//        };

    }]);

})();

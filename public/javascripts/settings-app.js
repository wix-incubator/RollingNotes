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

        this.updateComponent = function() {
            Wix.Settings.triggerSettingsUpdatedEvent(settings, parseCompId(settings._id));
            $http.post('/updateComponent', this.settings).success(function() {
                ;
                //may need to add a .failure(function) method
                var compId = parseCompId(settings._id);
                Wix.Settings.refreshAppByCompIds([compId]);
            });
        };

        this.showManageNotes = function() {
            $('#manage-notes').removeClass('hidden-manage-notes');
        };

        this.hideManageNotes = function() {
            $('#manage-notes').addClass('hidden-manage-notes');
        };

//        var max = 140;
//        $('textarea.note-text').keydown(function(e) {
//            var key = e.keyCode || e.charCode;
//            console.log(id);
//            if(key === 8 || key === 46) {
//                $('.character-max-hidden').removeClass('character-max');
//                $('.note-text').removeClass('note-text-max-count');
//            } else if (this.value.length >= max) {
//                $('.character-max-hidden').addClass('character-max');
//                var doc = document.activeElement;
//                $(doc).addClass('note-text-max-count');
//            } else {
//                $('.character-max-hidden').removeClass('character-max');
//                $('.note-text').removeClass('note-text-max-count');
//            }
//        });
    }]);

})();

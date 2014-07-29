/**
 * Created by elanas on 7/16/14.
 */


(function(){
    var app = angular.module("settingsApp", ['ui.sortable']);

    app.controller('settingsController', ['$window', '$scope', '$http', '$timeout', function($window, $scope, $http, $timeout) {
        this.settings = $window.settings;

        this.getSettings = function(settings) {
            console.log(settings);
        };

        var parseCompId = function(key){
            return key.substring(key.indexOf(".") + 1);
        }

        var updateComponent = function(newSettings) {
              this.settings = newSettings;

            $http.post('/updateComponent', this.settings).success(function() {
                console.log('posting');
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
            console.log("curr template: " + settings.design.template);
            var currTemplate = settings.design.template;
            settings.design = JSON.parse(defaultDesign);
            settings.design.template = currTemplate;
            updateComponent(settings);
        };


        Wix.UI.onChange('template', function(newSettings){
            console.log(JSON.stringify(newSettings));
            settings.design.template = newSettings.value;
            updateComponent(settings);
        });

        Wix.UI.onChange('color', function(newSettings){
            settings.design.text.color = newSettings.cssColor;
            updateComponent(settings);
        });


        Wix.UI.onChange('font', function(newSettings){
            console.log(JSON.stringify(newSettings));
            settings.design.text.size = newSettings.size;
            settings.design.text.style = newSettings.style;
            settings.design.text.family = newSettings.family;

            updateComponent(settings);
        });


        Wix.UI.onChange('bcolorWOpacity', function(newSettings){
            //settings.template = newSettings.value;
            settings.design.background.color = newSettings.rgba;
            settings.design.background.opacity = newSettings.opacity;
            updateComponent(settings);
        });

        Wix.UI.onChange('hcolorWOpacity', function(newSettings){
            settings.design.hover.color = newSettings.rgba;
            updateComponent(settings);
        });


        Wix.UI.onChange('borderColor', function(newSettings){
            settings.design.border.color = newSettings.cssColor;
            updateComponent(settings);
        });


        Wix.UI.onChange('borderWidth', function(newSettings){
            settings.design.border.width = newSettings;
            updateComponent(settings);
        });


        Wix.UI.onChange('radius', function(newSettings){
            settings.design.border.radius = newSettings;
            updateComponent(settings);
        });




        this.blur = function() {
              updateComponent(settings);
        }

        $scope.settings = $window.settings;

        $scope.$watchCollection('settings.notes', function(newNames, oldNames) {
            if(settings.notes.length === 0) {
                $('#manage-notes-content').addClass('empty-notes-background');
            } else {
                $('#manage-notes-content').removeClass('empty-notes-background');
            }
            updateComponent(settings);
        });

        this.addNote = function () {
            settings.notes.push({"index" : 0, "msg" : ""});
        }

        this.focusText = function (element) {
            $timeout(function() {
                if (!($("textarea:focus")) ) {
                    $("textarea:focus").blur();
                }
                $(element.target).closest('.note-container').find('textarea').focus();
            }, 0, false);
        }
    }]);

})();


var defaultDesign = '{ "template" : "", "text" : { "color" : "", "size:" : "", "family": "", "style" : "", "alignment" : "ltr" }, "background" : { "color" : "", "opacity" : "100" }, "hover" : { "on" : "false", "color" : "#ffffff", "opacity" : "100" }, "border" : { "color" : "", "width" : "", "radius" : "" } }';
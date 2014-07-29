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
            console.log('resetTemplate');
        };


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

        this.deleteNote = function(array, index) {
            array.splice(index, 1);
        }

        this.toggleWatch = function(element) {
            var el = $(element.target);

            el.toggleClass('icon-watch');
            el.toggleClass('icon-unwatch');

            if(el.hasClass('icon-unwatch')) {
                el.closest('.content-row').find('.note-text').addClass('unwatched-note');
            } else {
                el.closest('.content-row').find('.note-text').removeClass('unwatched-note');
            }
            //need to update settings settings.notes data
        }

        this.textLength = function(element, msg) {
            if (element.keyCode === 8 || element.keyCode === 44) {
                $(element.target).parent().find('.character-count-normal').css('color','black');
            } else if(msg.length >= 139) {
                $(element.target).parent().find('.character-count-normal').css('color','red');
            } else {
                $(element.target).parent().find('.character-count-normal').css('color','black');
            }
        }
    }]);

})();

/**
 * Created by elanas on 7/16/14.
 */

var templates = require("./defaultTemplates");

(function(){
    var app = angular.module("settingsApp", ['ui.sortable','ngAnimate']);

    app.controller('settingsController', ['$window', '$scope', '$http', '$timeout', function($window, $scope, $http, $timeout) {

        /**********************************
         *  Design Settings (first tab of settings)
         **********************************/

        this.settings = $window.settings;

        var parseCompId = function(key){
            return key.substring(key.indexOf(".") + 1);
        }

        var updateComponent = function(newSettings) {
              this.settings = newSettings;

            var instance = window.location.search.substring(window.location.search.indexOf('instance') + 9, window.location.search.indexOf('&'));
            this.settings.instance = instance;
            $http.post('/updateComponent', this.settings).success(function() {
                console.log('posting');
            }).error(function(data, status, headers, config) {
                 console.log("OH NO! WE FAILED TO POST!!!!!");
                 console.log("data: " + data + "; status: " + status);
            });
            Wix.Settings.triggerSettingsUpdatedEvent(settings, parseCompId(settings._id));
        };

        var setDesignOptions = function (template) {
            Wix.UI.set('color', {cssColor: template.text.color});
            Wix.UI.set('bcolorWOpacity', {rgba: template.background.color, opacity:template.background.opacity});
            Wix.UI.set('bOpacitySpinner', template.background.opacity * 100);
            Wix.UI.set('hcolorWOpacity', {rgba: template.hover.color, opacity:template.hover.opacity});
            Wix.UI.set('hOpacitySlider', template.hover.opacity * 100);
            Wix.UI.set('borderColor', {cssColor: template.border.color});
            Wix.UI.set('borderWidth', template.border.width);
            Wix.UI.set('radius', template.border.radius);
            Wix.UI.set('hoverCheckbox', template.hover.selected);
            return template;
        };

        this.resetTemplate = function() {
            var template = JSON.parse(JSON.stringify(templates[settings.design.template].design));
            settings.design = setDesignOptions(template);
            updateComponent(settings);
        };


        Wix.UI.onChange('template', function(newSettings){
            var that = this;
            // get instance of the original template values
            var originalDesign =  templates[settings.design.template].design;
            // get instance of the current user values
            var customDesign = JSON.parse(JSON.stringify(settings.design));
            // get instance of selected template
            var template = JSON.parse(JSON.stringify(templates[newSettings.value].design));

            // iterate over all changes between the original template values and current user values
            // to determine where the user made changes to the defaults
            DeepDiff.observableDiff(originalDesign, customDesign, function (difference) {
                // apply the change to the newly selected template
                DeepDiff.applyChange(template,template, difference);
            });

            // set the design options in the Settings UI
            settings.design = setDesignOptions(template);
            updateComponent(settings);
        });

        // event listeners for changing settings in design tab, uses wix ui lib

        Wix.UI.onChange('color', function(newSettings){
            settings.design.text.color = newSettings.cssColor;
            updateComponent(settings);
        });

        //TODO extract to common utils, I've seen this before
        var parseRBGA = function(rgba) {
            return rgba.substring(5, rgba.length-1).replace(/ /g, '').split(',');
        }


        Wix.UI.onChange('bcolorWOpacity', function(newSettings){
            settings.design.background.color = newSettings.rgba;
            settings.design.background.opacity = newSettings.opacity;
            Wix.UI.set('bOpacitySpinner', settings.design.background.opacity * 100);
            updateComponent(settings);
        });


        Wix.UI.onChange('bOpacitySpinner', function(newSettings){
            var currRGBA = parseRBGA(settings.design.background.color);
            settings.design.background.color = "rgba(" + currRGBA[0] + "," + currRGBA[1] + "," + currRGBA[2] + "," + newSettings/100 + ")";
            settings.design.background.opacity = newSettings/100;
            Wix.UI.set('bcolorWOpacity',{rgba: settings.design.background.color, opacity:settings.design.background.opacity});
            updateComponent(settings);
        });

        Wix.UI.onChange('hoverCheckbox', function(newSettings){
            settings.design.hover.selected = newSettings;
            updateComponent(settings);
        });

        Wix.UI.onChange('hcolorWOpacity', function(newSettings){
            if (!settings.design.hover.selected) Wix.UI.set('hoverCheckbox', true);
            settings.design.hover.color = newSettings.rgba;
            settings.design.hover.opacity = newSettings.opacity;
            Wix.UI.set('hOpacitySlider', settings.design.hover.opacity * 100);
            updateComponent(settings);
        });

        Wix.UI.onChange('hOpacitySlider', function(newSettings){
            if (!settings.design.hover.selected) Wix.UI.set('hoverCheckbox', true);
            var currRGBA = parseRBGA(settings.design.hover.color);
            settings.design.hover.color = "rgba(" + currRGBA[0] + "," + currRGBA[1] + "," + currRGBA[2] + "," + newSettings/100 + ")";
            settings.design.hover.opacity = newSettings/100;
            Wix.UI.set('hcolorWOpacity',{rgba: settings.design.hover.color, opacity:settings.design.hover.opacity});
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

        /**********************************
         *  Manage Notes Screen
         **********************************/

        $scope.visibleManageNotes = false;
        this.showManageNotes = function() {
            $scope.visibleManageNotes = true;
            $('.character-count-normal').removeClass('character-count-max');
            $('textarea').removeClass('note-text-max-count');

        };

        this.hideManageNotes = function() {
            $scope.visibleManageNotes = false;
        };

        this.blur = function() {
            $('.character-count-normal').removeClass('character-count-max');
            $('textarea').removeClass('note-text-max-count');
            updateComponent(settings);

        };

        $scope.settings = $window.settings;

        $scope.$watchCollection('settings.notes', function(newNames, oldNames) {
            updateComponent(settings);
        });

        this.addNote = function () {
            settings.notes.push({"visibility" : true, "msg" : "", key:uniqueNoteKey(), link:{type:"",url:"",display:"", targetVal:"0"}});
            focusNewNote();
        };

        var uniqueNoteKey = function() {
            var key;
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
            }
            key = (s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                s4() + '-' + s4() + s4() + s4());
            return key;
        };

        var loadNotesArray = function() {
            var matchingElements = [];
            $("textarea").each(function(index, element) {
                matchingElements.push(element);
            });
            return matchingElements;
        };

        var focusNewNote = function () {
            $timeout(function() {
                var array = loadNotesArray();
                var el = $(array[array.length-1]);
                el.focus();
            },0);

        };

        this.editNoteButton = function(e, index) {
          if (this.settings.notes[index].visibility) {
            this.focusText(e);
          }
        };

        this.focusText = function (element) {
            $timeout(function() {
                if (!($("textarea:focus")) ) {
                    $("textarea:focus").blur();
                }
                $(element.target).closest('.note-container').find('textarea').focus();
            }, 0, false);
        };

        this.deleteNote = function(array, index) {
            array.splice(index, 1);
        };

        $scope.hiddenNote = false;
        this.toggleWatch = function(element, index) {
            var el = $(element.target);
            $scope.hiddenNote = !$scope.hiddenNote;
//            el.toggleClass('icon-watch');
//            el.toggleClass('icon-unwatch');

            if($scope.hiddenNote) {
                el.closest('.content-row').find('.note-text').addClass('unwatched-note');
                settings.notes[index].visibility = false;
            } else {
                el.closest('.content-row').find('.note-text').removeClass('unwatched-note');
                settings.notes[index].visibility = true;
            }
            updateComponent(settings);

        };

        /**********************************
         *  Transition Settings (second tab of settings)
         **********************************/

        var shouldPreviewRun = true;
        var timeout;
        this.transitionFade = false;

        Wix.UI.onChange('transition', function(newSettings){
            settings.transition.effect = newSettings.value;
            updateComponent(settings);
        });

        Wix.UI.onChange('duration', function(newSettings){
            settings.transition.duration = Math.round(newSettings);
            updateComponent(settings);
        });


        var getNumVisibleNotes = function() {
            var count = 0;
            for (var i = 0; i < this.settings.notes.length; i++) {
                if (this.settings.notes[i].visibility === true) count++;
            }
            return count;
        };

        Visibility.change(function(e, state){
            if(state === 'hidden') {
                $('#previewTransitionButton').removeClass('stopPreviewButton');
                document.getElementById("previewTransitionButton").innerHTML = "Preview";
                $('.overlay-gray').css('visibility', 'hidden');
                $('.overlay-lock').children().css('pointer-events', 'auto');
                shouldPreviewRun = true;
                clearTimeout(timeout);
                return;
            }
        });

        this.previewTransition = function() {
//          Wix.Settings.refreshAppByCompIds([parseCompId(settings._id)]);

            if (!shouldPreviewRun) {
                $('#previewTransitionButton').removeClass('stopPreviewButton');
                document.getElementById("previewTransitionButton").innerHTML = "Preview";
                $('.overlay-gray').css('visibility', 'hidden');
                $('.overlay-lock').children().css('pointer-events', 'auto');
                settings.transition.preview = true;
                updateComponent(settings);
                settings.transition.preview = false;
                shouldPreviewRun = true;
                clearTimeout(timeout);
                return;
            }

            settings.transition.preview = true;
            shouldPreviewRun = false;

            var dur = ((settings.transition.duration * 1000) + 2000) * (getNumVisibleNotes() - 1) + 2000;

            $('#previewTransitionButton').addClass('stopPreviewButton');
            document.getElementById("previewTransitionButton").innerHTML = "Stop ";
            $('.overlay-gray').css('visibility', 'visible');
            $('.overlay-lock').children().css('pointer-events', 'none');
            $('.overlay-gray').css('pointer-events', 'auto');



            timeout = setTimeout( function() {
                $('#previewTransitionButton').removeClass('stopPreviewButton');
                document.getElementById("previewTransitionButton").innerHTML = "Preview";
                $('.overlay-gray').css('visibility', 'hidden');
                $('.overlay-lock').children().css('pointer-events', 'auto');
                shouldPreviewRun = true;

            }, dur - 1500)

            updateComponent(settings);
            settings.transition.preview = false;
        };

        /**********************************
         *  Add Link Popup dialog box
         **********************************/

        $scope.popupVisible = false;
        $scope.upperTextVisible = false;
        $scope.buttonsVisible = false;
        $scope.optionsVisible = false;
        $scope.linkOption = 0;

        this.showLinkPopup = function(note) {
            console.log('show link popup firing');
            this.noteForLink = note;
            $scope.popupVisible = true;
            $scope.buttonsVisible = true;
            $scope.linkOption = 0;
            loadPageDropdown();
        };

        this.showLink = function(type) {
            $scope.buttonsVisible = false;
            $scope.optionsVisible = true;
            $scope.linkOption = type;
            //TODO auto focus email and web links
        }

        this.closeLinkPopup = function(){
            $scope.popupVisible = false;
            $scope.upperTextVisible = false;
            $scope.buttonsVisible = false;
            $scope.optionsVisible = false;
            $scope.linkOption = 0;
        };

        //when OK button clicked, will construct link chosen or none
        this.setLink = function() {
            $scope.options = {1 : 'webLink', 2: 'pageLink', 3: 'emailLink', 4: 'docLink'};

            var chosenLink = $scope.options[$scope.linkOption];
            var link = this.noteForLink[chosenLink];
            clearLinks(this.noteForLink);

            this.noteForLink[chosenLink] = link;
            this.noteForLink.link.url = link;

            if($scope.linkOption === 1) {
                this.noteForLink.link.display = link;
                if(this.noteForLink.link.targetVal === 0) {
                    this.noteForLink.link.target = '_blank';
                } else {
                    this.noteForLink.link.target = '_top';
                }

            } else if ($scope.linkOption === 2) {
                var that = this;

                var index = settings.pages.indexOf(this.noteForLink.pageLink);
                this.noteForLink.link.display = link;
                this.noteForLink.link.target = '_top';

                Wix.Worker.getSiteInfo(function(siteInfo) {
                    // do something with the siteInfo
                    that.noteForLink.link.url = siteInfo.baseUrl + '#!/' + that.settings.pageIds[index];
                    updateComponent(that.settings);
                });
            } else if ($scope.linkOption === 3) {
                this.noteForLink.link.url = mailLink(this.noteForLink.emailLink,{subject: this.noteForLink.link.subject});
                this.noteForLink.link.display = "mail to: " + this.noteForLink.emailLink;
                this.noteForLink.link.target = '';

            } else if ($scope.linkOption === 4) {
                this.noteForLink.link.target = '_blank';
            }

            this.noteForLink.link.display = this.noteForLink.link.display.substring(0, 30);

            updateComponent(settings);

            this.closeLinkPopup();
        }

        this.backToOptions = function() {
            $scope.optionsVisible = false;
            $scope.buttonsVisible = true;
            $scope.linkOption = 0;
        }

        var clearLinks = function(note) {
            note.webLink = "";
            note.pageLink = "";
            note.emailLink = "";
            note.docLink = "";
            note.link.subject = "";
            note.link.url = "";
        }

        this.removeLink = function() {
            clearLinks(this.noteForLink);
            this.noteForLink.link.display = "";
            updateComponent(settings);
            this.closeLinkPopup();
        }

        var loadPageDropdown = function() {
            Wix.getSitePages(function (sitePages) {
                var arr = $.map(sitePages, function (el) {
                    return el;
                });
                var titles = [];
                var ids = [];
                for (x = 0; x < arr.length; x++) {
                    titles[x] = arr[x].title;
                    ids[x] = arr[x].id;
                }
                settings.pages = titles;
                settings.pageIds = ids;
            });
        };


        var mailLink = function(recepient, opts) {
            var link = "mailto:";
            link += window.encodeURIComponent(recepient);
            var params = [];
            angular.forEach(opts, function(value, key) {
                params.push(key.toLowerCase() + "=" + window.encodeURIComponent(value));
            });
            if (params.length > 0) {
                link += "?" + params.join("&");
            }
            return link;
        };


        this.docLink = function() {
            var that = this;
            Wix.Settings.openMediaDialog( Wix.Settings.MediaType.DOCUMENT, false, function(data) {
                var documentUrl = Wix.Utils.Media.getDocumentUrl(data.relativeUri);
                that.noteForLink.docLink = documentUrl;
                $scope.$apply(function () {
                    that.noteForLink.link.display = data.fileName;
                    that.noteForLink.link.display = that.noteForLink.link.display.substring(0, 30);
                });
                updateComponent(settings);
            });
        }

    }]);

    app.directive('httpPrefix', function() {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, controller) {
                function ensureHttpPrefix(value) {
                    // Need to add prefix if we don't have http:// prefix already AND we don't have part of it
                    if(value && !/^(https):\/\//i.test(value)
                        && 'https://'.indexOf(value) === -1) {
                        controller.$setViewValue('https://' + value);
                        controller.$render();
                        return 'https://' + value;
                    }
                    else
                        return value;
                }
                controller.$formatters.push(ensureHttpPrefix);
                controller.$parsers.push(ensureHttpPrefix);
            }
        };
    });

})();



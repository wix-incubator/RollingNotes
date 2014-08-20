(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/Adam_Cole/Documents/WixApps/rolling-notes/public/javascripts/defaultTemplates.js":[function(require,module,exports){
/********************************
 * Exports initial settings for default templates
 * chosen at the top of settings
 *******************************/


exports.defaultNote = {
    "design" : {
        "template" : "defaultNote",
        "text" : {
            "color" : "color-1",
            "preset": "Body-L",
            "alignment" : "center"
        },
        "background" : {
            "color" : "color-8",
            "opacity" : "1"
        },
        "hover" : {
            "selected" : true,
            "color" : "color-9",
            "opacity" : "1"
        },
        "border" : {
            "color" : "color-6",
            "width" : "5",
            "radius" : "0"
        }
    },

    "transition" : {
        "effect" : "fade",
        "preview" : "false",
        "duration" : "2"
    },

    "notes":[]
};

exports.spiralNote = {
    "design" : {
        "template" : "spiralNote",
        "text" : {
            "color" : "#000000",
            "preset": "Body-L",
            "alignment" : "center"
        },
        "background" : {
            "color" : "rgba(255,255,255,1)",
            "opacity" : "1"
        },
        "hover" : {
            "selected" : true,
            "color" : "rgba(175,204,255,1)",
            "opacity" : "1"
        },
        "border" : {
            "color" : "#505C73",
            "width" : "0",
            "radius" : "6"
        }
    },

    "transition" : {
        "effect" : "fade",
        "preview" : "false",
        "duration" : "2"
    },

    "notes":[]
};


exports.postitNote = {
    "design" : {
        "template" : "postitNote",
        "text" : {
            "color" : "#000000",
            "preset": "Body-L",
            "alignment" : "center"
        },
        "background" : {
            "color" : "rgba(251,239,172,1)",
            "opacity" : "1"
        },
        "hover" : {
            "selected" : true,
            "color" : "rgba(251,227,97,1)",
            "opacity" : "1"
        },
        "border" : {
            "color" : "#3f3a26",
            "width" : "0",
            "radius" : "3"
        }
    },
    "transition" : {
        "effect" : "fade",
        "preview" : "false",
        "duration" : "2"
    },

    "notes":[]
};


exports.chalkboardNote = {
    "design" : {
        "template" : "chalkboardNote",
        "text" : {
            "color" : "#FFFFFF",
            "preset": "Body-L",
            "alignment" : "center"
        },
        "background" : {
            "color" : "rgba(72,104,35,1)",
            "opacity" : "1"
        },
        "hover" : {
            "selected" : true,
            "color" : "rgba(94,141,48,1)",
            "opacity" : "1"
        },
        "border" : {
            "color" : "#FFFFFF",
            "width" : "8",
            "radius" : "8"
        }
    },

    "transition" : {
        "effect" : "fade",
        "preview" : "false",
        "duration" : "2"
    },

    "notes":[]
};
},{}],"/Users/Adam_Cole/Documents/WixApps/rolling-notes/public/javascripts/settings-app.js":[function(require,module,exports){
/**
 * Created by elanas on 7/16/14.
 */

var templates = require("./defaultTemplates");
var siteColorStyles;

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

        $scope.updateComponent = function(newSettings) {
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

        var getTemplateDesign = function(templateName) {
            var template = JSON.parse(JSON.stringify(templates[templateName].design));
            if (templateName === 'defaultNote') {
                template.text.color = siteColorStyles['color'];
                template.background.color = siteColorStyles['background-color'];
                template.border.color = siteColorStyles['border-color'];
                template.hover.color = siteColorStyles['hover'];
            }
            return template;
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
            var template = getTemplateDesign(settings.design.template);
            settings.design = setDesignOptions(template);
            $scope.updateComponent(settings);
        };


        Wix.UI.onChange('template', function(newSettings){
            getTemplateDesign(newSettings.value);
            var that = this;
            // get instance of the original template values
            var originalDesign = getTemplateDesign(settings.design.template);
            // get instance of the current user values
            var customDesign = JSON.parse(JSON.stringify(settings.design));
            // get instance of selected template
            var template = getTemplateDesign(newSettings.value);

            // iterate over all changes between the original template values and current user values
            // to determine where the user made changes to the defaults
            DeepDiff.observableDiff(originalDesign, customDesign, function (difference) {
                // apply the change to the newly selected template
                DeepDiff.applyChange(template,template, difference);
            });

            // set the design options in the Settings UI
            settings.design = setDesignOptions(template);
            console.log('changed template: ' );
            $scope.updateComponent(settings);
        });

        // event listeners for changing settings in design tab, uses wix ui lib

        Wix.UI.onChange('color', function(newSettings){
            settings.design.text.color = newSettings.cssColor;
            Wix.Styles.getStyleParams( function(styleParams) {
                console.log(JSON.stringify(styleParams));
            });
            $scope.updateComponent(settings);
        });

        Wix.UI.onChange('textAlignGroup', function(newSettings){
            settings.design.text.alignment = newSettings.value;
            $scope.updateComponent(settings);
        });

        //TODO extract to common utils, I've seen this before
        var parseRBGA = function(rgba) {
            return rgba.substring(5, rgba.length-1).replace(/ /g, '').split(',');
        }


        Wix.UI.onChange('bcolorWOpacity', function(newSettings){
            settings.design.background.color = newSettings.rgba;
            settings.design.background.opacity = newSettings.opacity;
            Wix.UI.set('bOpacitySpinner', settings.design.background.opacity * 100);
            $scope.updateComponent(settings);
        });


        Wix.UI.onChange('bOpacitySpinner', function(newSettings){
            var currRGBA = parseRBGA(settings.design.background.color);
            settings.design.background.color = "rgba(" + currRGBA[0] + "," + currRGBA[1] + "," + currRGBA[2] + "," + newSettings/100 + ")";
            settings.design.background.opacity = newSettings/100;
            Wix.UI.set('bcolorWOpacity',{rgba: settings.design.background.color, opacity:settings.design.background.opacity});
            $scope.updateComponent(settings);
        });

        Wix.UI.onChange('hoverCheckbox', function(newSettings){
            settings.design.hover.selected = newSettings;
            $scope.updateComponent(settings);
        });

        Wix.UI.onChange('hcolorWOpacity', function(newSettings){
            if (!settings.design.hover.selected) Wix.UI.set('hoverCheckbox', true);
            settings.design.hover.color = newSettings.rgba;
            settings.design.hover.opacity = newSettings.opacity;
            Wix.UI.set('hOpacitySlider', settings.design.hover.opacity * 100);
            $scope.updateComponent(settings);
        });

        Wix.UI.onChange('hOpacitySlider', function(newSettings){
            if (!settings.design.hover.selected) Wix.UI.set('hoverCheckbox', true);
            var currRGBA = parseRBGA(settings.design.hover.color);
            settings.design.hover.color = "rgba(" + currRGBA[0] + "," + currRGBA[1] + "," + currRGBA[2] + "," + newSettings/100 + ")";
            settings.design.hover.opacity = newSettings/100;
            Wix.UI.set('hcolorWOpacity',{rgba: settings.design.hover.color, opacity:settings.design.hover.opacity});
            $scope.updateComponent(settings);
        });

        Wix.UI.onChange('borderColor', function(newSettings){
            settings.design.border.color = newSettings.cssColor;
            $scope.updateComponent(settings);
        });


        Wix.UI.onChange('borderWidth', function(newSettings){
            settings.design.border.width = newSettings;
            $scope.updateComponent(settings);
        });


        Wix.UI.onChange('radius', function(newSettings){
            settings.design.border.radius = newSettings;
            $scope.updateComponent(settings);
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
            $scope.updateComponent(settings);

        };

        $scope.settings = $window.settings;

        $scope.$watchCollection('settings.notes', function() {
            $scope.updateComponent(settings);
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

        var focusNewNote = function () {
            $timeout(function() {
                var array = $("textarea");
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
            $scope.hiddenNote = !$scope.hiddenNote;
//            settings.notes[index].visibility = !$scope.hiddenNote;
            if($scope.hiddenNote) {
                settings.notes[index].visibility = false;
            } else {
                settings.notes[index].visibility = true;
            }
            $scope.updateComponent(settings);
        };

        /**********************************
         *  Transition Settings (second tab of settings)
         **********************************/

        var shouldPreviewRun = true;
        var timeout;

        Wix.UI.onChange('transition', function(newSettings){
            settings.transition.effect = newSettings.value;
            $scope.updateComponent(settings);
        });

        Wix.UI.onChange('duration', function(newSettings){
            settings.transition.duration = Math.round(newSettings);
            $scope.updateComponent(settings);
        });


        var getNumVisibleNotes = function() {
            var count = 0;//TODO FOREACH ME
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
                $scope.updateComponent(settings);
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

            $scope.updateComponent(settings);
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
            //TODO SWITCH ME
            switch($scope.linkOption) {
                case 1:
                {
                    this.noteForLink.link.display = link;
                    if (this.noteForLink.link.targetVal === 0) {
                        this.noteForLink.link.target = '_blank';
                    } else {
                        this.noteForLink.link.target = '_top';
                    }
                    break;
                }
            }


            if ($scope.linkOption === 2) {
                var that = this;
                var scope = $scope;

                var index = settings.pages.indexOf(this.noteForLink.pageLink);
                this.noteForLink.link.display = link;
                this.noteForLink.link.target = '_top';

                Wix.Worker.getSiteInfo(function(siteInfo) {
                    // do something with the siteInfo
                    that.noteForLink.link.url = siteInfo.baseUrl + '#!/' + that.settings.pageIds[index];
                    scope.updateComponent(that.settings);
                });
            } else if ($scope.linkOption === 3) {
                this.noteForLink.link.url = mailLink(this.noteForLink.emailLink,{subject: this.noteForLink.link.subject});
                this.noteForLink.link.display = "mail to: " + this.noteForLink.emailLink;
                this.noteForLink.link.target = '';

            } else if ($scope.linkOption === 4) {
                this.noteForLink.link.target = '_blank';
            }

            this.noteForLink.link.display = this.noteForLink.link.display.substring(0, 30);

            $scope.updateComponent(settings);

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
            $scope.updateComponent(settings);
            this.closeLinkPopup();
        }

        var loadPageDropdown = function() {
            Wix.getSitePages(function (sitePages) {
                settings.pages = _.pluck(sitePages, 'title');
                settings.pageIds = _.pluck(sitePages, 'id');
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
            var scope = $scope;
            Wix.Settings.openMediaDialog( Wix.Settings.MediaType.DOCUMENT, false, function(data) {
                var documentUrl = Wix.Utils.Media.getDocumentUrl(data.relativeUri);
                that.noteForLink.docLink = documentUrl;
                $scope.$apply(function () {
                    that.noteForLink.link.display = data.fileName;
                    that.noteForLink.link.display = that.noteForLink.link.display.substring(0, 30);
                });
                scope.updateComponent(settings);
            });
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

        $(document).ready(function( ){
            //Loading/Saving color scheme for default note color.. no easy way to do this
            var siteTemplateColor = document.registerElement('site-template-colors');
            document.body.appendChild(new siteTemplateColor());

            var styles = ['color', 'background-color', 'border-color'];
            siteColorStyles = $('site-template-colors').css(styles);
            siteColorStyles.hover = $('site-template-colors').css('outline-color');
            if (settings.design.color = 'color-1') {
                settings.design = getTemplateDesign('defaultNote');
            }
        });



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




},{"./defaultTemplates":"/Users/Adam_Cole/Documents/WixApps/rolling-notes/public/javascripts/defaultTemplates.js"}]},{},["/Users/Adam_Cole/Documents/WixApps/rolling-notes/public/javascripts/settings-app.js"]);

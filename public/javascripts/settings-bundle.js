(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/Adam_Cole/Documents/WixApps/rolling-notes/public/javascripts/defaultTemplates.js":[function(require,module,exports){
/********************************
 * Exports initial settings for default templates
 * chosen at the top of settings
 *******************************/


exports.defaultNote = {
    "design" : {
        "template" : "defaultNote",
        "text" : {
            "color" : "#ff7766",
            "preset": "Body-L",
            "alignment" : "ltr"
        },
        "background" : {
            "color" : "rgba(255,255,255,1)",
            "opacity" : "1"
        },
        "hover" : {
            "on" : true,
            "color" : "rgba(223,209,239,1)",
            "opacity" : "1"
        },
        "border" : {
            "color" : "#30366b",
            "width" : "4",
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
            "alignment" : "ltr"
        },
        "background" : {
            "color" : "rgba(255,255,255,1)",
            "opacity" : "1"
        },
        "hover" : {
            "on" : true,
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
            "alignment" : "ltr"
        },
        "background" : {
            "color" : "rgba(251,239,172,1)",
            "opacity" : "1"
        },
        "hover" : {
            "on" : true,
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
            "alignment" : "ltr"
        },
        "background" : {
            "color" : "rgba(72,104,35,1)",
            "opacity" : "1"
        },
        "hover" : {
            "on" : true,
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

(function(){
    var app = angular.module("settingsApp", ['ui.sortable']);

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

            //+ window.location.search.substring(window.location.search.indexOf('instance') + 9, window.location.search.indexOf('&'))
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
            Wix.UI.set('hoverCheckbox', template.hover.on);
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
            settings.design.hover.on = newSettings;
            updateComponent(settings);
        });

        Wix.UI.onChange('hcolorWOpacity', function(newSettings){
            if (!settings.design.hover.on) Wix.UI.set('hoverCheckbox', true);
            settings.design.hover.color = newSettings.rgba;
            settings.design.hover.opacity = newSettings.opacity;
            Wix.UI.set('hOpacitySlider', settings.design.hover.opacity * 100);
            updateComponent(settings);
        });

        Wix.UI.onChange('hOpacitySlider', function(newSettings){
            if (!settings.design.hover.on) Wix.UI.set('hoverCheckbox', true);
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

        this.showManageNotes = function() {
            $('#manage-notes').removeClass('hidden-manage-notes');
        };

        this.hideManageNotes = function() {
            $('#manage-notes').addClass('hidden-manage-notes');
        };

        this.blur = function() {
            $('.character-count-normal').css('color','black');
            $('textarea').removeClass('note-text-max-count');
            console.log("we blurred?");
            updateComponent(settings);
        };

        $scope.settings = $window.settings;

        $scope.$watchCollection('settings.notes', function(newNames, oldNames) {
            if(settings.notes.length === 0) {
                $('#manage-notes-content').addClass('empty-notes-background');
            } else {
                $('#manage-notes-content').removeClass('empty-notes-background');
            }

            updateComponent(settings);
//            focusNote();
        });

        this.addNote = function () {
            if (settings.notes.length == 50) {
                alert("You have reached the maximum number of notes.");
                return;
            }
            settings.notes.push({"visibility" : true, "msg" : "", key:uniqueNoteKey(), link:{type:"",url:"#",display:"", targetVal:"0"}});
            focusNewNote();
        };

        var uniqueNoteKey = function() {
            var key = 1;
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

        this.focusText = function (element) {
            $timeout(function() {
                if (!($("textarea:focus")) ) {
                    $("textarea:focus").blur();
                }
                $(element.target).closest('.note-container').find('textarea').focus();
            }, 2000, false);
        };

        this.deleteNote = function(array, index) {
            array.splice(index, 1);
        };

        this.toggleWatch = function(element, index) {
            var el = $(element.target);

            el.toggleClass('icon-watch');
            el.toggleClass('icon-unwatch');

            if(el.hasClass('icon-unwatch')) {
                el.closest('.content-row').find('.note-text').addClass('unwatched-note');
                settings.notes[index].visibility = false;
            } else {
                el.closest('.content-row').find('.note-text').removeClass('unwatched-note');
                settings.notes[index].visibility = true;
            }
            updateComponent(settings);

        };

        this.textLength = function(element, msg) {
            if (element.keyCode === 8 || element.keyCode === 44) {
                $(element.target).parent().find('.character-count-normal').css('color','black');
                $(element.target).removeClass('note-text-max-count');
            } else if(msg.length >= 139) {
                $(element.target).parent().find('.character-count-normal').css('color','red');
                $(element.target).addClass('note-text-max-count');
            } else {
                $(element.target).parent().find('.character-count-normal').css('color','black');
                $(element.target).removeClass('note-text-max-count');

            }
        };


        /**********************************
         *  Transition Settings (second tab of settings)
         **********************************/

        var shouldPreviewRun = true;
        var timeout;

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
                if (this.settings.notes[i].visibility == true) count++;
            }
            return count;
        };

        Visibility.change(function(e, state){
            if(state == 'hidden') {
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

        //TODO Use angular the right way
        //TODO ngshow/class etc.

        this.showLinkPopup = function(note){
            this.noteForLink = note;
            Wix.getSitePages(function(sitePages){
                var arr = $.map(sitePages, function(el) {
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
                console.log(ids);
                $('#link-popup').css('visibility', 'visible');
                makeBackInactive();
                showButtons();
            });


        };

        this.closeLinkPopup = function(){
            $('#link-popup').css('visibility', 'hidden');
            makeBackActive();
            hideButtons();
            hideContent();
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


        //when OK button clicked, will construct link chosen or none
        this.setLink = function() {
            updateComponent(settings);
            if($('.web-link').css('visibility') === 'visible') {
                this.noteForLink.pageLink = "";
                this.noteForLink.emailLink = "";
                this.noteForLink.docLink = "";
                this.noteForLink.link.subject = "";
                this.noteForLink.link.url= this.noteForLink.webLink;
                if (!this.noteForLink.link.url) this.noteForLink.link.url = "";
//                if (this.noteForLink.link.url && !/^https?:\/\//i.test(this.noteForLink.link)) {
//                    this.noteForLink.link.url = 'http://' + this.noteForLink.link.url;
//                }
                this.noteForLink.link.type = "web"
                this.noteForLink.link.display = this.noteForLink.link.url;
                if(this.noteForLink.link.targetVal == 0) {
                    this.noteForLink.link.target = '_blank';
                } else {
                    this.noteForLink.link.target = '_top';
                }

            } else if ($('.page-link').css('visibility') === 'visible') {
                var that = this;

                this.noteForLink.webLink = "";
                this.noteForLink.emailLink = "";
                this.noteForLink.docLink = "";
                this.noteForLink.link.subject = "";
                var index = settings.pages.indexOf(this.noteForLink.pageLink);
                this.noteForLink.link.display = this.noteForLink.pageLink;
                this.noteForLink.link.target = '_blank';

                Wix.Worker.getSiteInfo(function(siteInfo) {
                    // do something with the siteInfo
                    that.noteForLink.link.url = siteInfo.baseUrl + '/' + that.settings.pageIds[index];
                    console.log('Url in settings: ' + that.noteForLink.link.url);
                    updateComponent(that.settings);
                });
            } else if ($('.email-link').css('visibility') === 'visible') {
                this.noteForLink.webLink = "";
                this.noteForLink.pageLink = "";
                this.noteForLink.docLink = "";
                this.noteForLink.link.url = mailLink(this.noteForLink.emailLink,{subject: this.noteForLink.link.subject});
                this.noteForLink.link.type = "mail"
                this.noteForLink.link.display = "mail to: " + this.noteForLink.emailLink;
                this.noteForLink.link.target = '';

            } else if ($('.doc-link').css('visibility') === 'visible') {
                this.noteForLink.webLink = "";
                this.noteForLink.emailLink = "";
                this.noteForLink.pageLink = "";
                this.noteForLink.link.subject = "";

                this.noteForLink.link.url = this.noteForLink.docLink;
            }

            updateComponent(settings);

            $('#link-popup').css('visibility', 'hidden');
            makeBackActive();
            hideButtons();
            hideContent();
        }

        this.removeLink = function() {
            this.noteForLink.pageLink = "";
            this.noteForLink.emailLink = "";
            this.noteForLink.docLink = "";
            this.noteForLink.webLink = "";
            this.noteForLink.link.url = "";
            this.noteForLink.link.type = "";
            this.noteForLink.link.subject = "";
            this.noteForLink.link.display = "";


            updateComponent(settings);

            this.closeLinkPopup();
        }

        var hideButtons = function() {
            $('.link-options .btn-secondary').css('visibility', 'hidden');
            $('.learn-more p').html(' ');
            $('.learn-more a').html(' < Back to link options ');
        }
        var showButtons = function() {
            $('.link-options .btn-secondary').css('visibility', 'visible');
            //will need to change
            $('.learn-more p').html('Choose type of link');
            $('.learn-more a').html('Learn more');
        }

        this.backToOptions = function() {
            hideContent();
            showButtons();
        }

        var hideContent = function() {
            $('.option').css('visibility', 'hidden');
        }

        var makeBackInactive = function() {
            $('#manage-notes-content').css('pointer-events', 'none');
        }
        var makeBackActive = function() {
            $('#manage-notes-content').css('pointer-events', 'auto');
        }

        this.showLinkContent = function(type) {
            hideButtons();
            if(type === 1) {
                $('.web-link').css('visibility','visible');
                $('.web-text').focus();
            } else if (type === 2) {
                $('.page-link').css('visibility','visible');
            } else if (type === 3) {
                $('.email-link').css('visibility','visible');
                $('.email').focus();

            } else {
                $('.doc-link').css('visibility','visible');
            }
        }

    }]);

    app.directive('httpPrefix', function() {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, controller) {
                function ensureHttpPrefix(value) {
                    // Need to add prefix if we don't have http:// prefix already AND we don't have part of it
                    if(value && !/^(http):\/\//i.test(value)
                        && 'http://'.indexOf(value) === -1) {
                        controller.$setViewValue('http://' + value);
                        controller.$render();
                        return 'http://' + value;
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

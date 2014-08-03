/**
 * Created by elanas on 7/16/14.
 */

//var test = require("./defaultTemplate");
//console.log(JSON.stringify(test.defaultNote));
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
            Wix.UI.set('template', {value: settings.design.template});
            updateComponent(settings);
        };

        this.previewTransition = function() {
          Wix.Settings.refreshAppByCompIds([parseCompId(settings._id)]);
            settings.transition.preview = true;
            updateComponent(settings);
            settings.transition.preview = false;
//          updateComponent(settings);
        };


        Wix.UI.onChange('template', function(newSettings){
            settings.design.template = newSettings.value;
            console.log(settings.design.template);

            if (settings.design.template == 'default-note') {
                Wix.UI.set('color', "#ff7766");
                Wix.UI.set('bcolorWOpacity', "rgba(255,255,255,1)");
                Wix.UI.set('bOpacitySpinner', 100);
                Wix.UI.set('hcolorWOpacity', "rgba(255,255,255,1)");
                Wix.UI.set('hOpacitySlider', 100);
                Wix.UI.set('borderColor', "#30366b");
                Wix.UI.set('borderWidth', "4");
                Wix.UI.set('radius', "0");
                settings.design = JSON.parse(defaultDesign);
            } else if (settings.design.template == 'spiral-note')  {
                Wix.UI.set('color', "#000000");
                Wix.UI.set('bcolorWOpacity', "rgba(255,255,255,1)");
                Wix.UI.set('bOpacitySpinner', 100);
                Wix.UI.set('hcolorWOpacity', "rgba(255,255,255,1)");
                Wix.UI.set('hOpacitySlider', 100);
                Wix.UI.set('borderColor', "#d2e2ff");
                Wix.UI.set('borderWidth', "0");
                Wix.UI.set('radius', "6");
                settings.design = JSON.parse(spiralDesign);
            } else if (settings.design.template == 'postit-note') {
                Wix.UI.set('color', "#000000");
                Wix.UI.set('bcolorWOpacity', "rgba(251,239,172,1)");
                Wix.UI.set('bOpacitySpinner', 100);
                Wix.UI.set('hcolorWOpacity', "rgba(255,255,255,1)");
                Wix.UI.set('hOpacitySlider', 100);
                Wix.UI.set('borderColor', "#C8B26B");
                Wix.UI.set('borderWidth', "0");
                Wix.UI.set('radius', "6");
                settings.design = JSON.parse(postitDesign);
            }
            else if (settings.design.template == "chalkboard-note") {
                Wix.UI.set('color', "#FFFFFF");
                Wix.UI.set('bcolorWOpacity', "rgba(72,104,35,1)");
                Wix.UI.set('bOpacitySpinner', 100);
                Wix.UI.set('hcolorWOpacity', "rgba(255,255,255,1)");
                Wix.UI.set('hOpacitySlider', 100);
                Wix.UI.set('borderColor', "#FFFFFF");
                Wix.UI.set('borderWidth', "8");
                Wix.UI.set('radius', "8");
                settings.design = JSON.parse(chalkboardDesign);
            }

            updateComponent(settings);
        });

        Wix.UI.onChange('color', function(newSettings){
            settings.design.text.color = newSettings.cssColor;
            updateComponent(settings);
        });


//        Wix.UI.onChange('font', function(newSettings){
//            console.log('font: '  + JSON.stringify(newSettings));
//            settings.design.text.size = newSettings.size;
//            settings.design.text.style = newSettings.style;
//            settings.design.text.family = newSettings.family;
//
//            updateComponent(settings);
//        });


        var parseRBGA = function(rgba) {
            return rgba.substring(5, rgba.length-1).replace(/ /g, '').split(',');
        }


        Wix.UI.onChange('bcolorWOpacity', function(newSettings){
            //settings.template = newSettings.value;
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
            settings.design.hover.color = newSettings.rgba;
            settings.design.hover.opacity = newSettings.opacity;
            Wix.UI.set('hOpacitySlider', settings.design.hover.opacity * 100);
            updateComponent(settings);
        });


        Wix.UI.onChange('hOpacitySlider', function(newSettings){
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

        Wix.UI.onChange('transition', function(newSettings){
            settings.transition.effect = newSettings.value;
            console.log("transition: "  + settings.transition.effect);
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
            settings.notes.push({"visibility" : true, "msg" : ""});
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

        this.showLinkPopup = function(note){
            console.log(note);
            this.noteForLink = note;
            Wix.getSitePages(function(sitePages){
                var arr = $.map(sitePages, function(el) {
                    return el;
                });
                var titles = [];
                for (x = 0; x < arr.length; x++) {
                    titles[x] = arr[x].title;
                }
                settings.pages = titles;
                $('#link-popup').css('visibility', 'visible');
                makeBackInactive();
                showButtons();
            });


        }

        this.closeLinkPopup = function(){
            $('#link-popup').css('visibility', 'hidden');
            makeBackActive();
            hideButtons();
            hideContent();
        }

        //when OK button clicked, will construct link chosen or none
        this.setLink = function() {updateComponent(settings);
            if($('.web-link').css('visibility') === 'visible') {
                console.log('testing inside');
                this.noteForLink.pageLink = "";
                this.noteForLink.emailLink = "";
                this.noteForLink.docLink = "";

                this.noteForLink.link = this.noteForLink.webLink;
            } else if ($('.page-link').css('visibility') === 'visible') {
                this.noteForLink.webLink = "";
                this.noteForLink.emailLink = "";
                this.noteForLink.docLink = "";

                this.noteForLink.link = this.noteForLink.pageLink;
            } else if ($('.email-link').css('visibility') === 'visible') {
                this.noteForLink.webLink = "";
                this.noteForLink.pageLink = "";
                this.noteForLink.docLink = "";

                this.noteForLink.link = this.noteForLink.emailLink;
            } else if ($('.doc-link').css('visibility') === 'visible') {
                this.noteForLink.webLink = "";
                this.noteForLink.emailLink = "";
                this.noteForLink.pageLink = "";

                this.noteForLink.link = this.noteForLink.docLink;
            }
            updateComponent(settings);
            console.log("LINKS: " + JSON.stringify(this.noteForLink));

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
            this.noteForLink.link = "";

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
            } else if (type === 2) {
                $('.page-link').css('visibility','visible');
            } else if (type === 3) {
                $('.email-link').css('visibility','visible');
            } else {
                $('.doc-link').css('visibility','visible');
            }
        }

    }]);

})();


//var defaultDesign = '{ "template" : "", "text" : { "color" : "", "size:" : "", "family": "", "style" : "", "alignment" : "ltr" }, "background" : { "color" : "", "opacity" : "100" }, "hover" : { "on" : "false", "color" : "#ffffff", "opacity" : "100" }, "border" : { "color" : "", "width" : "", "radius" : "" } }';
var chalkboardDesign = '{ "template" : "chalkboard-note", "text" : { "color" : "#FFFFFF", "preset": "Body-L", "size:" : "", "family": "", "style" : { "bold": "", "italic": "", "underline": "" }, "alignment" : "ltr" }, "background" : { "color" : "rgba(72,104,35,1)", "opacity" : "100" }, "hover" : { "on" : "false", "color" : "rgba(255,255,255,1)", "opacity" : "100" }, "border" : { "color" : "#FFFFFF", "width" : "8", "radius" : "10" }}';
var defaultDesign = '{ "template" : "default-note", "text" : { "color" : "#ff7766", "preset": "Body-L", "size:" : "", "family": "", "style" : { "bold": "", "italic": "", "underline": "" }, "alignment" : "ltr" }, "background" : { "color" : "rgba(255,255,255,1)", "opacity" : "100" }, "hover" : { "on" : "false", "color" : "rgba(255,255,255,1)", "opacity" : "100" }, "border" : { "color" : "#30366b", "width" : "4", "radius" : "0" }}';
var spiralDesign = '{ "template" : "spiral-note", "text" : { "color" : "#000000", "preset": "Body-L", "size:" : "", "family": "", "style" : { "bold": "", "italic": "", "underline": "" }, "alignment" : "ltr" }, "background" : { "color" : "rgba(255,255,255,1)", "opacity" : "100" }, "hover" : { "on" : "false", "color" : "rgba(255,255,255,1)", "opacity" : "100" }, "border" : { "color" : "#d2e2ff", "width" : "0", "radius" : "6" }}';
var postitDesign = '{ "template" : "postit-note", "text" : { "color" : "#000000", "preset": "Body-L", "size:" : "", "family": "", "style" : { "bold": "", "italic": "", "underline": "" }, "alignment" : "ltr" }, "background" : { "color" : "rgba(251,239,172,1)", "opacity" : "100" }, "hover" : { "on" : "false", "color" : "rgba(255,255,255,1)", "opacity" : "100" }, "border" : { "color" : "#C8B26B", "width" : "0", "radius" : "6" }}';

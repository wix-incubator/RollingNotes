
/********************************************************************
 * Settings UI
 *
 * Includes all functionality for settings interface.
 * Used to customize/style rolling notes widget.
 *
 * Uses Angular for model.
 * Corresponds to views/settings.ejs.
 *
 ********************************************************************/

/* Grabbing note templates */
var templates = require("./defaultTemplates");
var siteColorStyles;

(function(){

    /*
     *   Initializing angular app called 'settingsApp'.
     *   Uses two external angular libraries: ui.sortable and ngAnimate
     */
    var app = angular.module("settingsApp", ['ui.sortable','ngAnimate']);

    /* Initializing angular controller to be used in views/settings.ejs */
    app.controller('settingsController', ['$window', '$scope', '$http', '$timeout', function($window, $scope, $http, $timeout) {

        /**************************************************
         *  Design Settings (first tab of settings)
         **************************************************/

        /* Represents JSON of all settings for note-widget instance.
         * Grabbed from the database to index/routes.js to settings.ejs to here*/
        this.settings = $window.settings;

        /**
         * Takes the widget unique id and grabs only the widget component id.
         * Used when communicating from Settings to Widget.
         *
         * @param key - widget unique id
         * @returns string - represents widget component id
         */
        var parseCompId = function(key){
            return key.substring(key.indexOf(".") + 1);
        }

        /**
         * Returns app settings instance.
         * Used to properly authenticate '/updateComponent' POST request.
         *
         * @returns string - settings instance
         */
        var parseSettingsInstance = function() {
            var instance = window.location.search.substring(window.location.search.indexOf('instance') + 9, window.location.search.indexOf('&'));
            return instance;
        }

        /**
         * Updates the database and the Widget with settings changes.
         *
         * @param newSettings
         */
        $scope.updateComponent = function(newSettings) {
            /* replacing old settings JSON with updated settings */
            this.settings = newSettings;

            /* Sets settings instance to be used in POST request authentication below */
            this.settings.instance = parseSettingsInstance();

            /*
             * Sends a POST request to routes/index.js.
             * POSTs new settings data to database.
             * This is how settings updates/changes are saved.
             */
            $http.post('/updateComponent', this.settings).success(function() {
                console.log('posting');
            }).error(function(data, status, headers, config) {
                 console.log("OH NO! WE FAILED TO POST!!!!!");
                 console.log("data: " + data + "; status: " + status);
            });

            /* Triggers the widget UI to refresh with settings changes */
            Wix.Settings.triggerSettingsUpdatedEvent(settings, parseCompId(settings._id));
        };

        /**
         * Returns a pre-load JSON based on the
         * widget template name in the parameter.
         *
         * @param templateName - name of widget-template to return
         * @returns JSON representing widget template settings
         */
        var getTemplateDesign = function(templateName) {
            var template = JSON.parse(JSON.stringify(templates[templateName].design));

            /*
             * SPECIAL CASE: 'defaultNote' loads to the color scheme of the site it was added to.
             * These settings are saved in the variable 'siteColorStyles'.
             */
            if (templateName === 'defaultNote') {
                template.text.color = siteColorStyles['color'];
                template.background.color = siteColorStyles['background-color'];
                template.border.color = siteColorStyles['border-color'];
                template.hover.color = siteColorStyles['hover'];
            }
            return template;
        };

        /**
         * Sets Settings UI to template specifications.
         * Uses Wix.UI with wix-model to change Settings components.
         *
         * Example:
         *      Wix.UI.set('wix-model-name', {key, value});
         *      'wix-model-name': set in settings.ejs for each Wix UI component.
         *      'key': specific to which Wix UI component is being set.
         *          Keys can be returned/printed with Wix.UI.get('wix-model-name').
         *          Look at Wix UI Lib for more information.
         *
         * @param template
         */
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
        };

        /**
         * Corresponds to 'Reset Design' button in Settings UI.
         * Resets changes made in Settings to current template's defaults.
         * Resets WidgetUI as well.
         */
        this.resetTemplate = function() {
            var template = getTemplateDesign(settings.design.template);
            setDesignOptions(template);
            settings.design = template;
            $scope.updateComponent(settings);
        };

        /**
         * Changes settings from old template to new template
         * keeping user changes in tact.
         *
         * @param newSettings - new template data
         */
        var applySettingsChangesToNewTemplate = function(newSettings) {

            /* Get instance of former default template settings */
            var originalDesign = getTemplateDesign(settings.design.template);

            /* Get instance of new default template */
            var template = getTemplateDesign(newSettings.value);

            /* Get instance of user's current template settings */
            var customDesign = JSON.parse(JSON.stringify(settings.design));

            /*
             * Iterates over all changes between the original template values and current user values
             * to determine where the user made changes to the defaults
             */
            DeepDiff.observableDiff(originalDesign, customDesign, function (difference) {
                // apply the change to the newly selected template
                DeepDiff.applyChange(template,template, difference);
            });

            /* Setting new template data */
            setDesignOptions(template);
            settings.design = template;
        }

        /********************************************************************************
         * EVENT LISTENERS for all changes in design tab of settings.
         * Uses Wix UI Lib and wix-models to listen to changes and
         * update settings data.
         *
         * Example:
         *      Wix.UI.onChange('wix-model-name', doSomethingWith(newSettings){});
         *          'wix-model-name' - set in settings.ejs for each Wix UI component
         *           doSomethingWith - callback that does something with updated data
         *           newSettings - JSON representing change to wix-model component
         *
         * Changes are persisted to WidgetUI via updateComponent(newSettings)
         *******************************************************************************/

        /**
         * Event listener for template wix-model changes.
         * Corresponds to the four template options at the
         * top of Settings Design tab.
         *
         * Updates Widget UI to template change with updateComponent(newSettings).
         *
         * @param newSettings - new template data
         *
         */
        Wix.UI.onChange('template', function(newSettings){
            applySettingsChangesToNewTemplate(newSettings);
            $scope.updateComponent(settings);
        });

        /**
         * Event listener for text color changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new color data
         */
        Wix.UI.onChange('color', function(newSettings){
            settings.design.text.color = newSettings.cssColor;
            $scope.updateComponent(settings);
        });

        /**
         * Event listener for text-align changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new text-align data
         */
        Wix.UI.onChange('textAlignGroup', function(newSettings){
            settings.design.text.alignment = newSettings.value;
            $scope.updateComponent(settings);
        });

        //TODO extract to common utils, I've seen this before
        var parseRBGA = function(rgba) {
            return rgba.substring(5, rgba.length-1).replace(/ /g, '').split(',');
        }

        /**
         * Event listener for background color picker changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new background color data
         */
        Wix.UI.onChange('bcolorWOpacity', function(newSettings){
            /* Color and opacity are saved with separate keys*/
            settings.design.background.color = newSettings.rgba;
            settings.design.background.opacity = newSettings.opacity;

            /* Updates opacity spinner with new opacity data */
            Wix.UI.set('bOpacitySpinner', settings.design.background.opacity * 100);
            $scope.updateComponent(settings);
        });

        /**
         * Event listener for opacity spinner changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new opacity data
         */
        Wix.UI.onChange('bOpacitySpinner', function(newSettings){
            var currRGBA = parseRBGA(settings.design.background.color);
            settings.design.background.color = "rgba(" + currRGBA[0] + "," + currRGBA[1] + "," + currRGBA[2] + "," + newSettings/100 + ")";
            settings.design.background.opacity = newSettings/100;

            /* Updates background color picker with new opacity data */
            Wix.UI.set('bcolorWOpacity',{rgba: settings.design.background.color, opacity:settings.design.background.opacity});
            $scope.updateComponent(settings);
        });

        /**
         * Event listener for hover checkbox changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new checkbox data
         */
        Wix.UI.onChange('hoverCheckbox', function(newSettings){
            settings.design.hover.selected = newSettings;
            $scope.updateComponent(settings);
        });

        /**
         * Event listener for hover color picker changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new hover color data
         */
        Wix.UI.onChange('hcolorWOpacity', function(newSettings){
            /* Automatically toggles hover checkbox to on if hover color selected */
            if (!settings.design.hover.selected) {
                Wix.UI.set('hoverCheckbox', true);
            }

            /* Color and opacity saved as separate values */
            settings.design.hover.color = newSettings.rgba;
            settings.design.hover.opacity = newSettings.opacity;

            /* Updates hover opacity slider to new opacity data */
            Wix.UI.set('hOpacitySlider', settings.design.hover.opacity * 100);
            $scope.updateComponent(settings);
        });

        /**
         * Event listener for hover opacity slider changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new opacity data
         */
        Wix.UI.onChange('hOpacitySlider', function(newSettings){
            /* Automatically toggles hover checkbox to on if hover opacity changed */
            if (!settings.design.hover.selected) {
                Wix.UI.set('hoverCheckbox', true);
            }

            var currRGBA = parseRBGA(settings.design.hover.color);
            settings.design.hover.color = "rgba(" + currRGBA[0] + "," + currRGBA[1] + "," + currRGBA[2] + "," + newSettings/100 + ")";
            settings.design.hover.opacity = newSettings/100;
            Wix.UI.set('hcolorWOpacity',{rgba: settings.design.hover.color, opacity:settings.design.hover.opacity});
            $scope.updateComponent(settings);
        });

        /**
         * Event listener for border color picker changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new border color data
         */
        Wix.UI.onChange('borderColor', function(newSettings){
            settings.design.border.color = newSettings.cssColor;
            $scope.updateComponent(settings);
        });

        /**
         * Event listener for border width slider changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new border width data
         */
        Wix.UI.onChange('borderWidth', function(newSettings){
            settings.design.border.width = newSettings;
            $scope.updateComponent(settings);
        });

        /**
         * Event listener for corner radius changes.
         * Read section heading 'EVENT LISTENERS' for more info.
         *
         * @param newSettings - new corner radius data
         */
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

        $scope.showIcons = false;
//        $scope.isFocused = false;

        this.printFocus = function(i) {
            console.log('isFocused: ' + i)
//            console.log('scope: ' + $scope.isFocused);
//            console.log('printing focus: ' + $scope.isFocused);
            return !i;
        }


        /**********************************
         *  Transition Settings (second tab of settings)
         **********************************/

        var shouldPreviewRun = true;
        var timeout;

        Wix.UI.onChange('transition', function(newSettings){
            settings.transition.effect = newSettings.value;
            settings.transition.preview = true;
            $scope.updateComponent(settings);
            settings.transition.preview = false;
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

        this.replayPreview = function() {
            settings.transition.preview = true;
            $scope.updateComponent(settings);
            settings.transition.preview = false;
        }

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
                    if (this.noteForLink.link.targetVal === 1) {
                        this.noteForLink.link.target = '_top';
                    } else {
                        this.noteForLink.link.target = '_blank';
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

        this.removeLink = function(note) {
            clearLinks(note);
            note.link.display = "";
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

            if (settings.design.text.color === 'color-1') {
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




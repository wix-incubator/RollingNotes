/** @jsx React.DOM */
/*jshint scripturl:true*/

/********************************************************************
 * Widget UI
 *
 * Includes all display logic for Rolling Notes widget.
 * Grabs settings model with styling and notes data from database.
 * In editor mode, widget responds to changes made in settings panel.
 * In preview & site mode, widget plays through user's notes
 *
 * Uses React for UI.
 * Corresponds to views/widget.ejs.
 *
 ********************************************************************/

/* Gets the React CSS Transition addon to add custom css transitions for rolling notes
* more information here: http://facebook.github.io/react/docs/animation.html */
var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

/* Instantiates the interval that will be used to roll notes */
var playNotesInterval;
/* Instantiates the timeout used on mouseleave to restart the slideshow */
var hoverTimeout;


/* Instantiate the constants used for display logic */
var PLAY  = 'play';
var PAUSE = 'pause';
var CLEARNOTE = 'clearnote';
var DEFAULT_NOTE_TEXT = "This is a note. Click to edit.";

var WidgetApp = React.createClass({

    /***************************
     *  Initial values and event listeners for widget
     ****************************/

    /**
     * Initializes the initial state of the react class on load.
     *
     * @returns state - returns the initial state of the widget
     */
    getInitialState: function() {
        return {settings: this.props.settings, mode: PAUSE, slideIndex: 0};
    },

    /**
     * Binds the necessary event listeners to the widget.
     */
    addEventListeners : function () {
        var that = this;

        /*Listens to settings updated events. When triggered, widget sets the
        * state to the updated settings and sets the slide shown in the widget to the
        * first visible note. */
        Wix.addEventListener(Wix.Events.SETTINGS_UPDATED, function(updatedSettings){
            that.setState({settings: updatedSettings});
            that.setState({slideIndex: that.getFirstVisibleNoteIndex()});

            /*If preview was set to true in settings, play preview of transition*/
            if (that.state.settings.transition.preview) {
                that.previewRollingNotes();
            }
        });

        /* Listens to changes in site mode */
        Wix.addEventListener(Wix.Events.EDIT_MODE_CHANGE, function(data) {

            /*If widget enters preview mode, begin playing notes*/
            if (data.editMode === 'preview') {
                that.playNotes();
            }

            /*If widget returns to editor mode, refresh the widget*/
            if (data.editMode === 'editor') {
                that.refreshWidget();
            }
        });

    },

    /**
     * Runs when the widget finishes rendering for the first time.
     * Adds the appropriate event listeners, sets the visible note and
     * play state
     */

    componentDidMount: function() {
        var that = this;

        /*Current mode of page widget is in (i.e. editor, published, site)*/
        var viewMode = Wix.Worker.Utils.getViewMode();

        /*Only adds event listeners when widget is in editor mode*/
        if (viewMode === 'editor') {
            this.addEventListeners();
        }

        /* SPECIAL CASE: this event listener is added to prevent a specific bug
        related to CSS transitions, intervals, and switching tabs. Listens to
        when user changes tabs: pauses notes when tab with widget is not visible
        and plays notes when user returns to the tab
         */
        Visibility.change(function(e, state) {
            if (viewMode === 'edit') {
                return;
            } else if(state === 'hidden') {
                that.pauseNotes();
            } else if (state === 'visible'){
                that.playNotes();
            }
        });

        /*Set note shown in widget to first visible note*/
        that.setState({slideIndex: that.getFirstVisibleNoteIndex()});
        /*If page is opened in site mode, play notes on loop*/
        if (viewMode === 'site') {
            this.playNotes();
        }
    },

    /*****************************
     * Dynamic Widget Styling
     *****************************/

    /**
     * Updates the widget's styling with the values passed
     * from the updated design settings. Uses React inline
     * styles: http://facebook.github.io/react/tips/inline-styles.html
     *
     * @returns Object - key, value pairs used to set CSS inline for widget
     */
    updateStyles: function () {
        var widgetStyle = {};
        var design = this.state.settings.design;
        widgetStyle.color = design.text.color;
        widgetStyle.textAlign = design.text.alignment;

        widgetStyle.backgroundColor = design.background.color;

        widgetStyle.borderColor = design.border.color;
        widgetStyle.borderWidth = design.border.width;
        widgetStyle.borderRadius = design.border.radius;

        return widgetStyle;
    },

    /**
     * Updates styles for notes with links: sets a pointer
     * cursor for notes with links and a default cursor otherwise
     *
     * @returns Object - key, value pairs used to set CSS inline for widget link
     */
    updateAnchorStyle: function() {
        var anchorStyle = {};
        anchorStyle.cursor = this.getNote().link.url ? 'pointer' : 'default';
        return anchorStyle;
    },

    /**
     * Updates styling for widget's header.
     *
     * @returns Object - key, value pairs used to set CSS inline for widget header
     */
    updateHeaderStyle: function() {
        var headerStyle = {};
        var design = this.state.settings.design;
        /*If widget template is postit note, sets the header color to darker shade
        * of background color*/
        if (this.state.settings.design.template === "postitNote") {
            headerStyle.backgroundColor = darkerShadeFromRGBA(design.background.color);
        }
        return headerStyle;
    },

    /**
     * On mouse hover, change background color to hover color & pause notes
     *
     * @param e - mouse enter event
     */
    handleMouseEnter: function(e) {
        var design = this.state.settings.design;
        /*If user selected hover color option, change background color to hover color*/
        if (design.hover.selected) {
            $(e.target).closest('.note-widget').css({"background-color": design.hover.color});
        }
        /*Pause on current note while mouse hovers*/
        this.pauseNotes();
    },

    /**
     * On mouse leave, change background back to original background color
     * and resume playing notes
     *
     * @param e - mouse leave event
     */
    handleMouseLeave: function(e) {
        $(e.target).closest('.note-widget').css({"background-color":this.state.settings.design.background.color});
        this.resumePlayNotes();
    },

    /*****************************
     * Rolling Note Animation Controllers
     *****************************/

    /**
     * Returns the duration widget remains on a note. Takes into
     * account the 2s transition time.
     *
     * @returns {number} - duration in ms between each slide animation
     */
    getSlideDuration: function() {
      return (this.state.settings.transition.duration * 1000) + 2000;
    },

    /**
     * Refreshes widget by reloading the window
     */
    refreshWidget: function() {
      window.location.reload();
    },

    /**
     * Clears the widget and shows a blank note
     */
    clearNote: function() {
        this.setState({mode:CLEARNOTE, slideIndex:-1});
    },

    /**
     * Resumes playing notes after pause on hover. Waits 2s before animations
     * resume.
     */
    resumePlayNotes: function() {
        var that = this;

        /*If notes are already playing, return*/
        if (this.state.mode === PLAY) {
            return;
        }

        this.setState({mode: PLAY});

        /*Times out for 2s, then plays a single note and then goes back into play notes loop */
        hoverTimeout = setTimeout(function() {
            that.nextNote();
            that.playNotes();
        },2000);
    },

    /**
     * Initializes the loop to roll through notes.
     */
    playNotes: function() {
        var that = this;

        /*If called while already playing, pause notes. This ensures that only one
        * interval is running at any given time*/
        if (this.state.mode === PLAY) {
            this.pauseNotes();
        }

        /*interval that plays notes*/
        playNotesInterval = setInterval(function() {
            that.nextNote();
        }, this.getSlideDuration());
    },

    /**
     * Pauses rolling notes by changing state to PAUSE and clearing
     * both the play notes interval and hover timeout
     */
    pauseNotes: function() {

        /*if notes already paused, return*/
        if (this.state.mode === PAUSE) {
            return;
        }

        this.setState({mode: PAUSE});
        clearInterval(playNotesInterval);
        clearTimeout(hoverTimeout);
    },

    /**
     * Plays a single transition from no note to first note. Runs
     * when user clicks on a transition option in settings
     */
    previewRollingNotes: function() {
        this.clearNote();       // start with a cleared widget
        this.nextNote();        // transition into first note
        this.pauseNotes();      // pause transitions
    },

    /*****************************
     * Notes view logic
     *****************************/

    /**
     * Iterates through all notes and counts how
     * many notes are visible.
     *
     * @returns {number} - count of visible notes
     */
    getNumOfVisibleNotes: function() {
        var count = 0;
        this.state.settings.notes.forEach(function(value) {
            if (value.visibility === true) {
                count++;
            }
        });
        return count;
    },

    /**
     * Iterates through notes until first visible note is found.
     * Returns the index of that note. If no visible note is found,
     * returns 0.
     *
     * @returns {number} - index of first visible note
     */
    getFirstVisibleNoteIndex: function() {
        for (var i = 0; i < this.state.settings.notes.length; i++) {
            if (this.state.settings.notes[i].visibility === true) {
                return i;
            }
        }
        return 0;
    },

    /**
     * Returns the index of the next visible note based on
     * the current slide index by looping through notes
     *
     * @returns {number} - index of next visible note
     */
    getNextVisibleNote : function () {
        var notes =  this.state.settings.notes;
        var nextVisibleSlide = ((this.state.slideIndex) + 1) % notes.length;
        while (notes[nextVisibleSlide].visibility === false) {
            nextVisibleSlide = (nextVisibleSlide +1) % notes.length;
        }
        return nextVisibleSlide;
    },

    /**
     * Sets the state of the slide index to the next visible note. This
     * is main function used to transition through notes.
     */
    nextNote: function() {
        /*If current state is note PLAY, sets state to PLAY*/
        if (this.state.mode !== PLAY) {
            this.setState({mode: PLAY});
        }

        /*If the number of visible notes is less than 2, sets slide index to 0 & returns */
        if (this.getNumOfVisibleNotes() < 2) {
            this.setState({slideIndex: 0});
            return;
        }

        this.setState({slideIndex: this.getNextVisibleNote()});
    },

    /**
     * Returns the url of the note associated with the current slide index.
     * If no link exists, returns dummy link
     *
     * @returns String - url of current note
     */
    getNoteLinkURL: function() {
        note = this.getNote();
        if(note.link.doc === true ) {
            note.link.url = Wix.Utils.Media.getDocumentUrl(note.link.url);
            note.link.doc = false;
        }
        return note.link.url ? note.link.url : 'javascript:;';
    },

    /**
     * Returns the note object associated with the current slide index.
     * If no notes exists, returns default note. If slide index is
     * -1, returns an empty note.
     *
     * @returns Object - current note to display
     */
    getNote: function() {
        var note;

        /*Sets note to empty note*/
        if (this.state.slideIndex === -1) {
            note = {msg: "", key:"thisisthetestkey", link: {url:"", target:""}};
        }

        /*Sets note to default note*/
        else if (this.state.settings.notes.length === 0 || this.getNumOfVisibleNotes() === 0) {
            note = {msg: DEFAULT_NOTE_TEXT, key:"defaultNote", link: {url:"", target:""}};
        }

        /*Sets note based on current index*/
        else {
            note = this.state.settings.notes[this.state.slideIndex];
        }

        return note;
    },


    /**
     * Returns a note inside a React CSS Transition Group. Sets the following properties & classes
     *      transitionName - gets mode of widget (i.e. PLAY/PAUSE). If PLAY mode, transitions occur
     *      className - gets 'rSlides' for styling and transition effect name
     *      key - unique keys for each animated element required for React CSS Transitions to function
     *
     * If in CLEARNOTE mode, returs nothing.
     *
     * @returns JSX - wrapper around note message
     */
    getNoteWrapper: function() {
      if (this.state.mode !== CLEARNOTE ) return  (
          <ReactCSSTransitionGroup  transitionName={this.state.mode}>
                  <div className={'rSlides ' + this.state.settings.transition.effect} key={this.getNote().key}>
                      <p>{this.getNote().msg}</p>
                  </div>
           </ReactCSSTransitionGroup>
          );
    },



    /************************
     * Widget UI rendered whenever widget state changed
     ************************/

    /**
     * Renders the widget based on its state. The function deos the following:
     *      Styling is applied inline.
     *      Link of the current note is added.
     *      Widget's template class is assigned.
     *      Mouse events are bound to handler functions.
     *
     * @returns JSX - returns the JSX/HTML that displays the current state of the widget
     */
    render: function() {
         return <a href={this.getNoteLinkURL()} target={this.getNote().link.target || ''} style={this.updateAnchorStyle()}>
            <div className={"note-widget " + this.state.settings.design.template} style={this.updateStyles()}
                    onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
                    <div  className="note-header" style={this.updateHeaderStyle()}></div>
                    <div className="note-content">
                         {this.getNoteWrapper()}
                    </div>
               </div>
            </a>;
    }
});

/*****************************
 * helper methods
 *****************************/


/**
 * Takes in a CSS rgba String (i.e. 'rgba(25,25,50, 0.5)') and returns
 * it as an array of 4 values (i.e. [25,25,50,0.5])
 *
 * @param rgba - string representing a CSS rgba value
 * @returns array - array of 4 rgba values
 */
var parseRBGA = function(rgba) {
    if (rgba) return rgba.substring(5, rgba.length-1).replace(/ /g, '').split(',');
    else return [255,255,255,1];
}

/**
 * Takes in a CSS rgba String and returns a slightly darker
 * rgba value.
 *
 * @param rgbaString - String representing a CSS rgba value
 * @returns {string} - String representing a darker CSS rgba value
 */
var darkerShadeFromRGBA = function (rgbaString) {
    var RGBA = parseRBGA(rgbaString);
    return "rgba(" +
        Math.abs((RGBA[0] - 26) % 255) + "," +
        Math.abs((RGBA[1] - 26) % 255) + "," +
        Math.abs((RGBA[2] - 26) % 255) + "," +
        RGBA[3] + ")";
};

/**
 * Renders the WidgetApp react component, passes it the global window.settings variable
 * as a prop and attatches it '#content' element in widget.ejs DOM
 */
React.renderComponent(<WidgetApp settings={window.settings} />, document.getElementById('content'));
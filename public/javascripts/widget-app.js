/** @jsx React.DOM */

var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

var playNotesInterval;
var hoverTimeout;

var PLAY  = 'play';
var PAUSE = 'pause';
var CLEARNOTE = 'clearnote';
var DEFAULT_NOTE_TEXT = "This is a note. Click to edit.";


var WidgetApp = React.createClass({

    /***************************
     *  Initial values and event listeners for widget
     ****************************/
    getInitialState: function() {
        return {settings: this.props.settings, mode: PAUSE, slideIndex: 0};
    },

    addEventListeners : function () {
        var that = this;
        Wix.addEventListener(Wix.Events.SETTINGS_UPDATED, function(updatedSettings){
            that.setState({settings: updatedSettings});
            that.setState({slideIndex: that.getFirstVisibleNoteIndex()});
            if (that.state.settings.transition.preview === true) {
                that.previewRollingNotes();
            }
        });

        Wix.addEventListener(Wix.Events.EDIT_MODE_CHANGE, function(data) {
            if (data.editMode === 'preview') {
                that.playNotes();
            }
            if (data.editMode === 'editor') {
                that.refreshWidget();
            }
        });

    },

    componentDidMount: function() {
        var that = this;
        var viewMode = Wix.Worker.Utils.getViewMode();

        if (viewMode === 'editor') {
            this.addEventListeners();
        }

        Visibility.change(function(e, state) {
            if (viewMode === 'edit') {
                return;
            } else if(state === 'hidden') {
                that.pauseNotes();
            } else if (state === 'visible'){
                that.playNotes();
            }
        });

        that.setState({slideIndex: that.getFirstVisibleNoteIndex()});
        if (viewMode === 'site') {
            this.playNotes();
        }
    },

    /*****************************
     * Dynamic Widget Styling
     *****************************/

    updateStyles: function () {
        var widgetStyle = {};
        var design = this.state.settings.design;
        widgetStyle.color = design.text.color;
        widgetStyle.textAlign = design.text.alignment;

        widgetStyle.backgroundColor = design.background.color;

        widgetStyle.borderColor = design.border.color;
        widgetStyle.borderWidth = design.border.width;
        widgetStyle.borderRadius = design.border.radius;

        return widgetStyle
    },

    updateAnchorStyle: function() {
        var anchorStyle = {};
        anchorStyle.cursor = this.getNote().link.url ? 'pointer' : 'default';
        return anchorStyle;
    },

    updateHeaderStyle: function() {
        var headerStyle = {};
        var design = this.state.settings.design;
        if (this.state.settings.design.template === "postitNote") {
            headerStyle.backgroundColor = darkerShadeFromRGBA(design.background.color)
        }
        return headerStyle;
    },

    handleMouseEnter: function(e) {
        if(this.state.settings.design.hover.selected) {
            $(e.target).closest('.note-widget').css({"background-color":this.state.settings.design.hover.color});
        }
        this.pauseNotes();
    },

    handleMouseLeave: function(e) {
        $(e.target).closest('.note-widget').css({"background-color":this.state.settings.design.background.color});
        this.resumePlayNotes();
    },

    /*****************************
     * Rolling Note Animation Controllers
     *****************************/
    getSlideDuration: function() {
      return (this.state.settings.transition.duration * 1000) + 2000;
    },

    refreshWidget: function() {
      window.location.reload();
    },

    clearNote: function() {
        this.setState({mode:CLEARNOTE, slideIndex:-1});
    },

    resumePlayNotes: function() {
        var that = this;
        if (this.state.mode === PLAY) {
            return;
        }
        this.setState({mode: PLAY});
        hoverTimeout = setTimeout(function() {
            that.nextNote();
            that.playNotes();
        },2000);
    },

    playNotes: function() {
        var that = this;
        if (this.state.mode === PLAY) {
            this.pauseNotes();
        }
        playNotesInterval = setInterval(function() {
            that.nextNote();
        }, this.getSlideDuration());
    },

    pauseNotes: function() {
        if (this.state.mode === PAUSE) {
            return;
        }
        this.setState({mode: PAUSE});
        clearInterval(playNotesInterval);
        clearTimeout(hoverTimeout);
    },

    previewRollingNotes: function() {
        this.clearNote();
        this.nextNote();
        this.pauseNotes();
    },

    /*****************************
     * Notes view logic
     *****************************/

    getNumOfVisibleNotes: function() {
        var count = 0;
        this.state.settings.notes.forEach(function(value) {
            if (value.visibility === true) {
                count++;
            }
        });
        return count;
    },

    getFirstVisibleNoteIndex: function() {
        for (var i = 0; i < this.state.settings.notes.length; i++) {
            if (this.state.settings.notes[i].visibility === true) {
                return i;
            }
        };
        return 0;
    },

    getNextVisibleNote : function () {
        var notes =  this.state.settings.notes;
        var nextVisibleSlide = ((this.state.slideIndex) + 1) % notes.length;
        while (notes[nextVisibleSlide].visibility === false) {
            nextVisibleSlide = (nextVisibleSlide +1) % notes.length;
            console.log(nextVisibleSlide);
        }
        return nextVisibleSlide;
    },

    nextNote: function() {
        if (this.state.mode !== PLAY) {
            this.setState({mode: PLAY});
        }
        if (this.getNumOfVisibleNotes() <= 1) {
            this.setState({slideIndex: 0});
            return;
        }
        this.setState({slideIndex: this.getNextVisibleNote()});
    },

    getNoteLinkURL: function() {
        note = this.getNote();
        if(note.link.doc === true ) {
            note.link.url = Wix.Utils.Media.getDocumentUrl(note.link.url);
            note.link.doc = false;
        }
        return note.link.url ? note.link.url : 'javascript:;';
    },

    getNote: function() {
        var note;


        if (this.state.slideIndex === -1) {
            note = {msg: "", key:"thisisthetestkey", link: {url:"", target:""}};;
        } else if (this.state.settings.notes.length === 0 || this.getNumOfVisibleNotes() === 0) {
            note = {msg: DEFAULT_NOTE_TEXT, key:"defaultNote", link: {url:"", target:""}};
        } else {
            note = this.state.settings.notes[this.state.slideIndex];
        }

        return note;
    },

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

var parseRBGA = function(rgba) {
    if (rgba) return rgba.substring(5, rgba.length-1).replace(/ /g, '').split(',');
    else return [255,255,255,1];
}

var darkerShadeFromRGBA = function (rgbaString) {
    var RGBA = parseRBGA(this.state.settings.design.background.color);
    return "rgba(" +
        Math.abs((RGBA[0] - 26) % 255) + "," +
        Math.abs((RGBA[1] - 26) % 255) + "," +
        Math.abs((RGBA[2] - 26) % 255) + "," +
        RGBA[3] + ")";
};

React.renderComponent(<WidgetApp settings={window.settings} />, document.getElementById('content'));
/** @jsx React.DOM */

var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

var DEFAULT_NOTE_TEXT = "This is a note. Click to edit.";

var previewNotesInterval;
var playNotesInterval;
var hoverTimeout;

var PLAY  = 'play';
var PAUSE = 'pause';

var WidgetApp = React.createClass({

    /***************************
     *  Initial values and event listeners for widget
     ****************************/
    getInitialState: function() {
        return {settings: this.props.settings, mode: PAUSE, slideIndex: 0};
    },

    componentWillMount: function() {
        this.setState({slideIndex: this.getFirstVisibleNoteIndex()});
    },

    componentDidMount: function() {
        var that = this;
        var viewMode = Wix.Worker.Utils.getViewMode();
        //TODO extract to common utils, I've seen this before

        // add event listeners to connect updated settings to widget
        if (viewMode === 'editor') {
            Wix.addEventListener(Wix.Events.SETTINGS_UPDATED, function(updatedSettings){
                that.setState({settings: updatedSettings});
                that.setState({slideIndex: that.getFirstVisibleNoteIndex()});
                if (that.state.settings.transition.preview === true) {
                    that.previewRollingNotes();

                }
            });
            //TODO make button interval and preview the same to avoid hacky code
            Wix.addEventListener(Wix.Events.EDIT_MODE_CHANGE, function(data) {
                if (data.editMode === 'preview') {
                    if(previewNotesInterval != null) {
                        clearInterval(previewNotesInterval);
                        previewNotesInterval = null;
                        that.pauseNotes();
                    }
                    that.playNotes();
                }
                if (data.editMode === 'editor') {
                    that.refreshWidget();
                }
            });
        }

        Visibility.change(function(e, state) {
            var viewMode = Wix.Worker.Utils.getViewMode();
            if(state === 'hidden') {
                if(previewNotesInterval != null) {
                    that.refreshWidget();
                } else if (viewMode ==='preview' ||  viewMode === 'site') {
                    that.pauseNotes();
                }
            } else if (state === 'visible' && (viewMode === 'preview' || viewMode === 'site')){
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
        //widgetStyle.font = this.state.settings.design.font;
        widgetStyle.color = design.text.color;
        widgetStyle.fontSize = design.text.size;
        widgetStyle.fontFamily = design.text.family;
        widgetStyle.fontStyle = design.text.style;
        widgetStyle.textAlign = design.text.alignment;


        widgetStyle.backgroundColor = design.background.color;

        widgetStyle.borderColor = design.border.color;
        widgetStyle.borderWidth = design.border.width;
        widgetStyle.borderRadius = design.border.radius;


        return widgetStyle
    },

    updateAnchorStyle: function() {
        var anchorStyle = {};
        anchorStyle.cursor = this.getNoteContent().link.url ? 'pointer' : 'default';
        return anchorStyle;
    },

    updateHeaderStyle: function() {
      var headerStyle = {};
        //TODO template updates itself?

        if (this.state.settings.design.template === "postitNote") {
          //TODO put as utils method
          var currRGBA = parseRBGA(this.state.settings.design.background.color);
          headerStyle.backgroundColor = "rgba(" +
              Math.abs((currRGBA[0] - 26) % 255) + "," +
              Math.abs((currRGBA[1] - 26) % 255) + "," +
              Math.abs((currRGBA[2] - 26) % 255) + "," +
              currRGBA[3] + ")";
      }
      return headerStyle;
    },

    handleMouseEnter: function(e) {
        console.log("mouseon");
        if(this.state.settings.design.hover.selected){
            $(e.target).closest('.note-widget').css({"background-color":this.state.settings.design.hover.color});
        }
        this.pauseNotes();
    },

    handleMouseLeave: function(e) {
        console.log("mouseoff");
        $(e.target).closest('.note-widget').css({"background-color":this.state.settings.design.background.color});
        this.hoverOffPlay();
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

    hoverOffPlay: function() {
        var that = this;
        if (this.state.mode === 'play') {
            console.log('playing in hover: return');
            return;
        }
        this.setState({mode: 'play'});
        hoverTimeout = setTimeout(function() {
            that.nextNote();
            that.pauseNotes();
            that.playNotes();
        },2000);
    },

    //TODO add toggleNote method instead of play/pause notes
    playNotes: function() {
        var that = this;
        if (this.state.mode === 'play') {
            return;
        }
        this.setState({mode: 'play'});
        //this.nextNote();
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
        if (this.state.mode !== PAUSE) {
            this.refreshWidget();
        }
        var that = this;
        var counter = 0;
        this.setState({mode:'play', slideIndex: this.getFirstVisibleNoteIndex()});
        this.nextNote();
        previewNotesInterval = setInterval(function(){
            counter++;
            that.nextNote();
            if (counter >= that.getNumOfVisibleNotes() - 1) {
                that.refreshWidget();
            }
        }, this.getSlideDuration());
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
//        var i;
//        this.state.settings.notes.forEach(function(value, index) {
//            console.log("Index: " + value.visibility);
//            if (value.visibility === true) {
//                console.log('returning index: ' + index);
//                return index;
//            }
//        });


        for (var i = 0; i < this.state.settings.notes.length; i++) {
            if (this.state.settings.notes[i].visibility === true) {
                return i;
            }
        };

        return 0;
    },

    nextNote: function() {
        if (this.state.settings.notes.length <= 1) {
            return;
        }
        var nextVisibleSlide = ((this.state.slideIndex) + 1) % this.state.settings.notes.length;;
        while (this.state.settings.notes[nextVisibleSlide].visibility === false) {
            nextVisibleSlide = (nextVisibleSlide +1) % this.state.settings.notes.length;
        }
        this.setState({slideIndex: nextVisibleSlide});
    },

    getNoteContent: function() {
        var notecontent;

        if (this.state.settings.notes.length === 0 || this.getNumOfVisibleNotes() === 0) {
            notecontent = {msg: DEFAULT_NOTE_TEXT, link: {url:"", target:""}};
        } else {
            notecontent = this.state.settings.notes[this.state.slideIndex];
        }
        return notecontent;
    },

    /************************
     * Widget UI rendered whenever widget state changed
     ************************/
    render: function() {
        return <a href={this.getNoteContent().link.url || "javascript:;"} target={this.getNoteContent().link.target || ''} style={this.updateAnchorStyle()}>
            <div className={"note-widget " + this.state.settings.design.template} style={this.updateStyles()}
                    onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
                    <div  className="note-header" style={this.updateHeaderStyle()}></div>
                    <div className="note-content">
                        <ReactCSSTransitionGroup  transitionName={this.state.mode}>
                         <div className={'rSlides ' + this.state.settings.transition.effect} key={this.getNoteContent().key}>
                              <p>{this.getNoteContent().msg}</p>
                         </div>
                        </ReactCSSTransitionGroup>
                    </div>
               </div>
            </a>;
    }
});

/*****************************
 * helper methods
 *****************************/

//TODO common utils method
var parseRBGA = function(rgba) {
    if (rgba) return rgba.substring(5, rgba.length-1).replace(/ /g, '').split(',');
    else return [255,255,255,1];
}

React.renderComponent(<WidgetApp settings={window.settings} />, document.getElementById('content'));
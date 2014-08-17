/** @jsx React.DOM */

var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

var previewNotesInterval;
var playNotesInterval;

var WidgetApp = React.createClass({

    /***************************
     *  Initial values and event listeners for widget
     ****************************/
    getInitialState: function() {
        return {settings: this.props.settings, mode: "pause", slideIndex: 0};
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
                if (that.state.settings.transition.preview == true) {
                    that.previewRollingNotes();

                }
            });
            //TODO make button interval and preview the same to avoid hacky code
            Wix.addEventListener(Wix.Events.EDIT_MODE_CHANGE, function(data) {
                if (data.editMode == 'preview') {
                    if(previewNotesInterval != null) {
                        clearInterval(previewNotesInterval);
                        previewNotesInterval = null;
                        that.pauseNotes();
                    }
                    that.playNotes();
                }
                if (data.editMode == 'editor') {
                    that.refreshWidget();
                }
            });
        }

        that.setState({slideIndex: that.getFirstVisibleNoteIndex()});
        if (viewMode == 'site') {
            this.playNotes();
        }

        Visibility.change(function(e, state) {
            var viewMode = Wix.Worker.Utils.getViewMode();
            if(state == 'hidden') {
                if(previewNotesInterval != null) {
                    that.refreshWidget();
                } else if (viewMode == 'preview' ||  viewMode == 'site') {
                    that.pauseNotes();
                }
            } else if (state == 'visible' && (viewMode == 'preview' || viewMode == 'site')){
                that.playNotes();
            }
        });
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

<<<<<<< HEAD
        widgetStyle.borderColor = this.state.settings.design.border.color;
        widgetStyle.borderWidth = this.state.settings.design.border.width;
        widgetStyle.borderRadius = this.state.settings.design.border.radius + '%';

=======
        widgetStyle.backgroundColor = design.background.color;
>>>>>>> 7bae037b546194e602c0914c1327cd2e5ee9bceb

        widgetStyle.borderColor = design.border.color;
        widgetStyle.borderWidth = design.border.width;
        widgetStyle.borderRadius = design.border.radius + '%';

        return widgetStyle
    },

    updateAnchorStyle: function() {
        var anchorStyle = {};
        if (this.getNoteContent().link.url) {
            anchorStyle.cursor = 'pointer';
        } else {
            anchorStyle.cursor = 'default';
        }
        return anchorStyle;
    },

    updateHeaderStyle: function() {
      var headerStyle = {};
        //TODO template updates itself?

        if (this.state.settings.design.template === "postit-note") {
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
        if(this.state.settings.design.hover.on){
            $(e.target).closest('.note-widget').css({"background-color":this.state.settings.design.hover.color});
        }
        this.pauseNotes();
    },

    handleMouseLeave: function(e) {
        console.log("mouseoff");
        $(e.target).closest('.note-widget').css({"background-color":this.state.settings.design.background.color});
        this.playNotes();
    },

    /*****************************
     * Rolling Note Animation Controllers
     *****************************/

    refreshWidget: function() {
      window.location.reload();
    },

    //TODO add toggleNote method instead of play/pause notes
    playNotes: function() {
        var that = this;
        if (this.state.mode == 'play') {
            return;
        }
        this.setState({mode: 'play'});
        //this.nextNote();
        playNotesInterval = setInterval(function() {
            that.nextNote();
        }, (this.state.settings.transition.duration * 1000) + 2000);
    },

    pauseNotes: function() {
        if (this.state.mode == 'pause') {
            return;
        }
        this.setState({mode: 'pause'});
        clearInterval(playNotesInterval);
    },

    previewRollingNotes: function() {
        if (this.state.mode != 'pause') {
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
        }, (that.state.settings.transition.duration * 1000) + 2000);
    },


    /*****************************
     * Notes view logic
     *****************************/

    getNumOfVisibleNotes: function() {
        var count = 0;
        for (var i = 0; i < this.state.settings.notes.length; i++) {
          if (this.state.settings.notes[i].visibility == true) {
              count++;
          }
        }
        return count;
    },

    getFirstVisibleNoteIndex: function() {
        for (var i = 0; i < this.state.settings.notes.length; i++) {
            if (this.state.settings.notes[i].visibility == true) {
                return i;
            }
        }
        return 0;
    },

    nextNote: function() {
        if (this.state.settings.notes.length <= 1) {
            return;
        }
        var nextVisibleSlide = ((this.state.slideIndex) + 1) % this.state.settings.notes.length;;
        while (this.state.settings.notes[nextVisibleSlide].visibility == false) {
            nextVisibleSlide = (nextVisibleSlide +1) % this.state.settings.notes.length;
            console.log("nextVisinLoop: " + nextVisibleSlide);
        }
        this.setState({slideIndex: nextVisibleSlide});
    },

    getNoteContent: function() {
        var numofVisibleNotes = this.getNumOfVisibleNotes();
        var notecontent;

        if (this.state.settings.notes.length == 0 || numofVisibleNotes == 0) {
            notecontent = {msg: 'This is a note. Click to edit.', link: {url:"", target:""}};
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
    return rgba.substring(5, rgba.length-1).replace(/ /g, '').split(',');
}

React.renderComponent(<WidgetApp settings={window.settings} />, document.getElementById('content'));
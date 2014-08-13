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
        // add event listeners to connect updated settings to widget
        Wix.addEventListener(Wix.Events.SETTINGS_UPDATED, function(updatedSettings){
            that.setState({settings: updatedSettings});
            that.setState({slideIndex: that.getFirstVisibleNoteIndex()});
            if (that.state.settings.transition.preview == true) {
                that.previewRollingNotes();

            }
        });

        that.setState({slideIndex: that.getFirstVisibleNoteIndex()});

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
        if (Wix.Worker.Utils.getViewMode() == 'site') this.playNotes();

        Visibility.change(function(e, state) {

            if(state == 'hidden' && previewNotesInterval != null) {
                that.refreshWidget();
            } else if (state == 'hidden' && (Wix.Utils.getViewMode() == 'preview' ||  Wix.Utils.getViewMode() == 'site')) {
                that.pauseNotes();

            } else if (state == 'visible' && (Wix.Utils.getViewMode() == 'preview' ||  Wix.Utils.getViewMode() == 'site')){
                that.playNotes();
            }
        });
    },

    /*****************************
     * Dynamic Widget Styling
     *****************************/

    updateStyles: function () {
        var widgetStyle = {};
        //widgetStyle.font = this.state.settings.design.font;
        widgetStyle.color = this.state.settings.design.text.color;
        widgetStyle.fontSize = this.state.settings.design.text.size;
        widgetStyle.fontFamily = this.state.settings.design.text.family;
        widgetStyle.fontStyle = this.state.settings.design.text.style;

        widgetStyle.backgroundColor = this.state.settings.design.background.color;

        widgetStyle.borderColor = this.state.settings.design.border.color;
        widgetStyle.borderWidth = this.state.settings.design.border.width;
        widgetStyle.borderRadius = this.state.settings.design.border.radius + '%';

        console.log($('.rSlides').innerHeight());
//        if ($('.rSlide')[0].scrollWidth >  $('#div-id').width()) {
//            //Text has over-flowed
//        }


        return widgetStyle
    },

    updateAnchorStyle: function() {
        var anchorStyle = {};
        if (this.getNoteContent().link.url) anchorStyle.cursor = 'pointer';
        else anchorStyle.cursor = 'default';
        return anchorStyle;
    },

    updateHeaderStyle: function() {
      var headerStyle = {};
      if (this.state.settings.design.template == "postit-note") {
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

    playNotes: function() {
        var that = this;
        if (this.state.mode == 'play') return;
        this.setState({mode: 'play'});
        //this.nextNote();
        playNotesInterval = setInterval(function() {
            that.nextNote();
        }, (this.state.settings.transition.duration * 1000) + 2000);
    },

    pauseNotes: function() {
        if (this.state.mode == 'pause') return;
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
          if (this.state.settings.notes[i].visibility == true) count++;
        }
        return count;
    },

    getFirstVisibleNoteIndex: function() {
        for (var i = 0; i < this.state.settings.notes.length; i++) {
            if (this.state.settings.notes[i].visibility == true) return i;
        }
        return 0;
    },

    nextNote: function() {
        if (this.state.settings.notes.length <= 1) return;
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
        {console.log('url: ' + this.getNoteContent().link.url)}
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

var parseCompId = function(key){
    return key.substring(key.indexOf(".") + 1);
}

var parseRBGA = function(rgba) {
    return rgba.substring(5, rgba.length-1).replace(/ /g, '').split(',');
}

React.renderComponent(<WidgetApp settings={window.settings} />, document.getElementById('content'));
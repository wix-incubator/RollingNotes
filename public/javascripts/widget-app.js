/** @jsx React.DOM */

var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

var WidgetApp = React.createClass({

    getInitialState: function() {
        return {settings: this.props.settings, mode: "pause", slideIndex: 0};
    },


    onSettingsChange: function() {
        var that = this;
        Wix.addEventListener(Wix.Events.SETTINGS_UPDATED, function(updatedSettings){
            that.setState({settings: updatedSettings});
            if (that.state.settings.transition.preview == true) {
                console.log("preview");
                that.previewRollingNotes();
            }
            //if (that.state.settings.transition.preview == true) that.previewTransition();
        });
    },

    componentDidMount: function() {
        var that = this;
        this.onSettingsChange();
        Wix.addEventListener(Wix.Events.EDIT_MODE_CHANGE, function(data) {
            if (data.editMode == 'preview') {
                that.setState({mode: 'play'});
                that.playNotes();
            }
            if (data.editMode == 'editor') {
                //that.setState({mode: 'pause',slideIndex:0});
                that.refreshWidget();
            }
        });
    },


    handleMouseEnter: function(e) {
        console.log("mouseon");
        if(this.state.settings.design.hover.on){
            $(e.target).closest('.note-widget').css({"background-color":this.state.settings.design.hover.color});
        }


    },

    handleMouseLeave: function(e) {
        console.log("mouseof?");
        console.log(this.state.settings.design.background.color);

        $(e.target).closest('.note-widget').css({"background-color":this.state.settings.design.background.color});
    },

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
        widgetStyle.borderRadius = this.state.settings.design.border.radius;

        return widgetStyle
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

    refreshWidget: function() {
      window.location.reload();
    },

    previewRollingNotes: function() {
        console.log("we are in the preview notes function");
        if (this.state.mode != 'pause') {
            console.log('in pause');
            this.refreshWidget();
        }
        var that = this;
        var counter = 0;
        this.setState({mode:'play', slideIndex: 0});
        var looper = setInterval(function(){
            counter++;
            that.nextNote();
            console.log("Counter is: " + counter);
            if (counter >= that.state.settings.notes.length) {
                clearInterval(looper);

                setTimeout(function(){
                    that.setState({mode:'pause'});
                }, 1000);
            }
        }, that.state.settings.transition.duration * 1000);
    },

    playNotes: function() {
        var that = this;
        setInterval(function() {
            that.nextNote();
        }, this.state.settings.transition.duration * 1000);
    },

    updateNoteStyles: function() {
        var noteStyles = {};
        if (this.state.mode == 'editor') {
            noteStyles.transition = 'none';
        }
        return noteStyles;

    },

    nextNote: function() {
        this.setState({slideIndex: (this.state.slideIndex+1) % this.state.settings.notes.length});
    },

    getNoteContent: function() {
        var notecontent;
//        console.log("mode:  " + this.state.mode);
        if (this.state.settings.notes.length == 0) {
            notecontent = 'This is a note. Click to edit.';
        }
        // if in pause mode
//        else if (this.state.mode == 'pause') {
//            console.log('displaying pause info');
//            notecontent = <div className="rSlides firstNote">
//                            {this.state.settings.notes[0].msg}
//                          </div>;
//        }

        // if in play mode
        else {
            notecontent = this.state.settings.notes[this.state.slideIndex];

        }
        return notecontent;
//        else {
//            notecontent =  this.state.settings.notes.map(function(note, i) {
//                if (note.msg && that.state.slideIndex==i) return (
//                    <div className={'rSlides ' + that.state.settings.transition.effect} key={Math.random()}>
//                            {note.msg}
//                    </div>
//                    );
//            });
//        }
    },

    render: function() {
        var that = this;
//        var notecontent,notecontentshow;
        // if no notes exist
//        console.log("mode:  " + this.state.mode);
//        if (this.state.settings.notes.length == 0) {
//            notecontent = <div className="rSlides fillerNote">
//                            This is a note. Click to edit.
//                          </div>;
//        }
//        // if in pause mode
////        else if (this.state.mode == 'pause') {
////            console.log('displaying pause info');
////            notecontent = <div className="rSlides firstNote">
////                            {this.state.settings.notes[0].msg}
////                          </div>;
////        }
//
//        // if in play mode
//        else {
//            notecontent =  this.state.settings.notes.map(function(note, i) {
//                  if (note.msg && that.state.slideIndex==i) return (
//                        <div className={'rSlides ' + that.state.settings.transition.effect} key={Math.random()}>
//                            {note.msg}
//                        </div>
//                    );
//            });
//        }
        return <div className={"note-widget " + this.state.settings.design.template} style={this.updateStyles()}
                    onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave} onClick={this.nextNote}>
                    <div  className="note-header" style={this.updateHeaderStyle()}></div>
                    <div className="note-content">
                        <ReactCSSTransitionGroup  transitionName="example">
                         <div className={'rSlides ' + this.state.settings.transition.effect} key={this.getNoteContent().key}>
                            {this.getNoteContent().msg}
                            {console.log('Key:' + this.getNoteContent().key)}
                         </div>
                        </ReactCSSTransitionGroup>

                    </div>
               </div>;
    }
});

var parseCompId = function(key){
    return key.substring(key.indexOf(".") + 1);
}

var parseRBGA = function(rgba) {
    return rgba.substring(5, rgba.length-1).replace(/ /g, '').split(',');
}



//Wix.UI.onChange('*', function(value, key){
//    console.log('I CHANGED!!');
//    console.log('Key: ' + key + ", val: " + value);
//});

React.renderComponent(<WidgetApp settings={window.settings} />, document.getElementById('content'));
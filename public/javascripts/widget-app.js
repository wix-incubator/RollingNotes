/** @jsx React.DOM */

var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

var WidgetApp = React.createClass({

    getInitialState: function() {
        return {settings: this.props.settings, mode: "editor", slideIndex: 0};
    },


    onSettingsChange: function() {
        var that = this;
        Wix.addEventListener(Wix.Events.SETTINGS_UPDATED, function(updatedSettings){
            that.setState({settings: updatedSettings});
            if (that.state.settings.transition.preview == true) {
                console.log("did we reach here");
                that.updateSlider(true);
            }

            if (that.state.settings.transition.updateSlider == true) {
                console.log("update slideshow from settings");
                that.updateSlider(true);
            }
            //if (that.state.settings.transition.preview == true) that.previewTransition();
        });
    },

    componentDidMount: function() {
        var that = this;
        this.onSettingsChange();
        Wix.addEventListener(Wix.Events.EDIT_MODE_CHANGE, function(data) {
            that.setState({mode: data.editMode});
            console.log("mode: " + that.state.mode);
            if (that.state.mode == 'preview') that.updateSlider(true);
            //that.playSlider();
        });
        if (this.state.settings.transition.effect == "typewriter") {
        }
        this.flexSlide();
        $('.flexslider').flexslider('pause');

        // this.flexSlide();
       // this.pauseSlider();
       // $('.flexslider').flexslider('pause');
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

    getMessageArray: function () {
        var notes = this.state.settings.notes;
        var messageArray = [];
        for (var i = 0; i < notes.length; i++) {
            messageArray.push(notes[i].msg.toString());
        }
        return messageArray;
    },

    typeMessages:  function() {
        this.getMessageArray();
        var messages = this.getMessageArray();
        if (messages.length == 0) messages = ["This is a note. Click to edit!"];
//
//        $(".note-content").remove();
//        $(".note-widget").append("<div class='note-content'></div>");

//        if (!loop) messages.push(messages[0]);
        $(".note-content").typed({
            strings: messages,
            typespeed: 20,
            // backspacing speed
            backSpeed: 0,
            // time before backspacing
            backDelay: 1000,
            loop: true,
            callback: function () {
//                $(".note-content").remove();
//                $(".note-widget").append("<div class='note-content'></div>");
            }
        });
    },

    previewTransition: function() {
       // this.typeMessages(false);
    },

    pauseSlider : function() {
        $('.flexslider').flexslider('pause');
    },

    playSlider: function(){
        $('.flexslider').flexslider('pause');
        $('.flexslider').flexslider('play');
        console.log("play");
    },

    updateSlider: function(play){
        console.log("update");
        var raw_slider = $(".flexslider").html(); // grab the unaltered HTML and store it
        console.log(raw_slider);
        console.log(JSON.stringify(this.getNoteListForSlider()));
        $(".flexslider").remove();
        $(".note-content").append("<div class='flexslider'></div>");
        console.log(this.getNoteList());
        $(".flexslider").html(raw_slider);
        this.flexSlide();
        console.log("update play? " + play);
        if (!play) $('.flexslider').flexslider('pause');

    },

    getNoteListForSlider : function () {
       var list;
       for (var i = 0; i < this.state.settings.notes.length; i++) {
           list += <li>this.state.settings.notes[i].msg</li>
       }
       return list;
    },

    flexSlide: function () {
      console.log("flexslide");
      var that = this;
      var effect = this.state.settings.transition.effect;
      var animation, direction;
      console.log("effect in slider: " + effect);
      if (effect == "typewriter" || effect == "fade" ) {
            animation = "fade";
      } else {
          animation = "slide";
          direction = effect;
      }
      $('.flexslider').flexslider({
          animation: animation,
          direction: direction,
          slideshowSpeed: this.state.settings.transition.duration * 1000,
          controlNav: false,
          directionNav: false,
          slideshow: true,
          animationLoop: true,
//          start: function (slider) {
//            console.log("start slideshow");
//          },
          start: function(slider) {
          },
          after: function (slider) {
              if (slider.currentSlide == 0 && that.state.mode == "editor") {
                  console.log("pause slideshow");
                  slider.pause();
              }
          }
      });
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

    getNoteList: function() {
        var notecontent;
        if (this.state.settings.notes.length > 0) notecontent = this.state.settings.notes[0].msg;
        else notecontent = "This is a note. Click to edit.";


        if (this.state.settings.notes.length > 0) noteList = this.state.settings.notes.map(function(note) {
            if (note.visibility) {
                return (
                    <li className="note-text">
                        <a target={note.link.target} href={note.link.url}>
                        {note.msg}
                        </a>
                    </li>
                    );
            }
        });
        else noteList = <li>This is a note. Click to edit.</li>;
        return noteList;
    },

    slideNote: function() {
        console.log("sliding note");
        this.setState({slideIndex: (this.state.slideIndex+1) % this.state.settings.notes.length});
    },

    render: function() {
        var notecontent = this.getNoteList();
        var test =  this.state.settings.notes.map(function(note, i) {
            return (
                <div key={note.msg}>
                    {note.msg}
                </div>
                );
        });
        var currSlide =   <div key={this.state.settings.notes[this.state.slideIndex].msg}>
                                {this.state.settings.notes[this.state.slideIndex].msg}
                          </div>;
        return <div className={"note-widget " + this.state.settings.design.template} style={this.updateStyles()}
                    onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave} onClick={this.slideNote}>
                    <div  className="note-header" style={this.updateHeaderStyle()}></div>
                    <div className="note-content">
                        <div className="flexslider">
                            <ul className="slides">
                                {noteList}
                            </ul>
                        </div>
                    </div>
                    <div>
                        <ReactCSSTransitionGroup transitionName="example">
                            {test}
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
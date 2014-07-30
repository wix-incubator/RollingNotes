/** @jsx React.DOM */
var HelloMessage = React.createClass({

    getInitialState: function() {
        return {settings: this.props.settings, mode: "editor"};
    },


    onSettingsChange: function() {
        var that = this;
        Wix.addEventListener(Wix.Events.SETTINGS_UPDATED, function(updatedSettings){
            that.setState({settings: updatedSettings});
            if (that.state.settings.transition.preview == true) {
                console.log("did we reach here");
                that.playSlider();

            }
            //if (that.state.settings.transition.preview == true) that.previewTransition();
        });
    },

    componentDidMount: function() {
        var that = this;
        this.onSettingsChange();
        Wix.addEventListener(Wix.Events.EDIT_MODE_CHANGE, function(data) {
            that.setState({mode: data.editMode});
            that.playSlider();
        });
        if (this.state.settings.transition.effect == "typewriter") {
        }
        this.flexSlide();
        //$('.flexslider').flexslider('pause');

        // this.flexSlide();
       // this.pauseSlider();
       // $('.flexslider').flexslider('pause');
    },


    handleMouseEnter: function(e) {
        $(e.target).closest('.note-widget').css({"background-color":this.state.settings.design.hover.color});


    },

    handleMouseLeave: function(e) {
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
          slideshowSpeed: 2000,
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
        if (this.state.settings.design.text.style.bold == true) widgetStyle.fontWeight = 'bold';
        else widgetStyle.fontWeight = 'normal';
        if (this.state.settings.design.text.style.italic == true) widgetStyle.fontStyle = 'italic';
        else widgetStyle.fontStyle = 'normal';
        if (this.state.settings.design.text.style.underline == true) widgetStyle.textDecoration = 'underline';
        else widgetStyle.textDecoration = 'none';

        widgetStyle.backgroundColor = this.state.settings.design.background.color;

        widgetStyle.borderColor = this.state.settings.design.border.color;
        widgetStyle.borderWidth = this.state.settings.design.border.width;
        widgetStyle.borderRadius = this.state.settings.design.border.radius;

        return widgetStyle
    },


    render: function() {
        var notecontent;
        if (this.state.settings.notes.length > 0) notecontent = this.state.settings.notes[0].msg;
        else notecontent = "This is a note. Click to edit.";


        if (this.state.settings.notes.length > 0) noteList = this.state.settings.notes.map(function(note) {
            return (
                 <li className="note-text">
                    <a href={note.link} target="_blank">
                        {note.msg}
                    </a>
                 </li>
            );
        });
        else noteList = <li>This is a note. Click to edit.</li>;

        return <div className={"note-widget " + this.state.settings.design.template} style={this.updateStyles()}
                    onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave} onClick={this.playSlider}>
                    <div  className="note-header"></div>
                    <div className="note-content">
                        <div className="flexslider">
                            <ul className="slides">
                                {noteList}
                            </ul>
                        </div>
                    </div>
               </div>;
    }
});

var parseCompId = function(key){
    return key.substring(key.indexOf(".") + 1);
}


//Wix.UI.onChange('*', function(value, key){
//    console.log('I CHANGED!!');
//    console.log('Key: ' + key + ", val: " + value);
//});

React.renderComponent(<HelloMessage settings={window.settings} />, document.getElementById('content'));
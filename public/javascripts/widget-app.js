/** @jsx React.DOM */
var HelloMessage = React.createClass({

    getInitialState: function() {
        return {settings: this.props.settings};
    },


    onSettingsChange: function() {
        var that = this;
        Wix.addEventListener(Wix.Events.SETTINGS_UPDATED, function(updatedSettings){
            that.setState({settings: updatedSettings});
            if (that.state.settings.transition.preview == true) {
                that.forceUpdate(function() {
                    console.log("did I force the update?");
                });
                that.playSlider();
            }
            //if (that.state.settings.transition.preview == true) that.previewTransition();
        });
    },

    componentDidMount: function() {
        this.onSettingsChange();
        if (this.state.settings.transition.effect == "typewriter") {
        }
        this.flexSlide();

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

    typeMessages:  function(loop) {
        this.getMessageArray();
        var messages = this.getMessageArray();
        if (messages.length == 0) messages = ["This is a note. Click to edit!"];

        $(".note-content").remove();
        $(".note-widget").append("<div class='note-content'></div>");

        if (!loop) messages.push(messages[0]);
        $(".note-content").typed({
            strings: messages,
            typespeed: 20,
            // backspacing speed
            backSpeed: 0,
            // time before backspacing
            backDelay: 1000,
            loop: loop,
            callback: function () {
                $(".note-content").remove();
                $(".note-widget").append("<div class='note-content'></div>");
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
      $('.flexslider').flexslider({
          animation: "fade",
          direction: "horizontal",
          slideshowSpeed: 2000,
          controlNav: true,
          directionNav: false,
          slideshow: true,
          animationLoop: true,
//          start: function (slider) {
//            console.log("start slideshow");
//          },
          start: function(slider) {
          },
          after: function (slider) {
              if (slider.currentSlide == 0) {
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


        var noteList = this.state.settings.notes.map(function(note) {
            return (
                 <li>{note.msg}</li>
            );
        });
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


//Wix.UI.onChange('*', function(value, key){
//    console.log('I CHANGED!!');
//    console.log('Key: ' + key + ", val: " + value);
//});

React.renderComponent(<HelloMessage settings={window.settings} />, document.getElementById('content'));
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
                console.log("preview");
            }
            //if (that.state.settings.transition.preview == true) that.previewTransition();
        });
    },

    componentDidMount: function() {
        var that = this;
        this.onSettingsChange();
        Wix.addEventListener(Wix.Events.EDIT_MODE_CHANGE, function(data) {
            that.setState({mode: data.editMode});
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


    slideNote: function() {
        console.log("sliding note");
        this.setState({slideIndex: (this.state.slideIndex+1) % this.state.settings.notes.length});
    },

    render: function() {
        var that = this;
        var test =  this.state.settings.notes.map(function(note, i) {
            console.log("slideindex: " + that.state.slideIndex + ", i: " + i);
            if (note.msg && that.state.slideIndex==i) return (
                <div className="rSlides" key={i}>
                    {note.msg}
                </div>
                );
        });
        return <div className={"note-widget " + this.state.settings.design.template} style={this.updateStyles()}
                    onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave} onClick={this.slideNote}>
                    <div  className="note-header" style={this.updateHeaderStyle()}></div>
                    <div className="note-content">
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
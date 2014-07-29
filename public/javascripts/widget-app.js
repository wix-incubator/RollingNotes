/** @jsx React.DOM */
var HelloMessage = React.createClass({

    getInitialState: function() {
        return {settings: this.props.settings};
    },


    onSettingsChange: function() {
        var that = this;
        Wix.addEventListener(Wix.Events.SETTINGS_UPDATED, function(updatedSettings){
            that.setState({settings: updatedSettings});
        });
    },

    componentDidMount: function() {
        this.onSettingsChange();
    },


    handleMouseEnter: function(e) {
        $(e.target).closest('.note-widget').css({"background-color":this.state.settings.design.hover.color});


    },

    handleMouseLeave: function(e) {
        $(e.target).closest('.note-widget').css({"background-color":this.state.settings.design.background.color});
    },

    cancelEvent: function(e) {

    },


    render: function() {
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


        var headerStyle = {
            'backgroundColor' : widgetStyle.backgroundColor
        };
        console.log(JSON.stringify(headerStyle.backgroundColor));


        var notecontent;
        if (this.state.settings.notes.length > 0) notecontent = this.state.settings.notes[0].msg;
        else notecontent = "This is a note. Click to edit.";
        return <div className={"note-widget " + this.state.settings.design.template} style={widgetStyle}
                    onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
                    <div  className="note-header"></div>
                    <div className="note-content">
                        {notecontent}
                    </div>
               </div>;
    }
});


//Wix.UI.onChange('*', function(value, key){
//    console.log('I CHANGED!!');
//    console.log('Key: ' + key + ", val: " + value);
//});

React.renderComponent(<HelloMessage settings={window.settings} />, document.getElementById('content'));
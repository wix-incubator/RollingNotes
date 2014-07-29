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

    render: function() {
        this.onSettingsChange();
        var widgetStyle = {};
        widgetStyle.borderRadius = this.state.settings.radius;
        widgetStyle.borderWidth = this.state.settings.borderWidth;
        //if (widgetStyle.borderWidth) widgetStyle.borderStyle = "solid";


        return <div className={"note-widget " + this.state.settings.template} style={widgetStyle}>
                    <div  className="note-header"></div>
                    <div className="note-content">
                        {this.state.settings.notes[0].msg}
                    </div>
               </div>;
    }
});


//Wix.UI.onChange('*', function(value, key){
//    console.log('I CHANGED!!');
//    console.log('Key: ' + key + ", val: " + value);
//});

React.renderComponent(<HelloMessage settings={window.settings} />, document.getElementById('content'));
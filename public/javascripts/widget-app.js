/** @jsx React.DOM */
var HelloMessage = React.createClass({

    getInitialState: function() {
        return {template: this.props.settings.template};
    },


    addSettingsListener: function() {
        var that = this;
        Wix.addEventListener(Wix.Events.SETTINGS_UPDATED, function(updatedSettings){
            that.onTemplateChange(updatedSettings.template);
        });
    },

    onTemplateChange: function(updatedTemplate) {
        this.setState({template: updatedTemplate});
    },

    render: function() {
        this.addSettingsListener();
//        return <div className="note-widget spiral-note">
        return <div className={"note-widget " + this.state.template}>
            <div className="note-header"></div>
                    <div className="note-content">
                        Hello {this.props.settings.test}
                    </div>
               </div>;
    }
});


//Wix.UI.onChange('*', function(value, key){
//    console.log('I CHANGED!!');
//    console.log('Key: ' + key + ", val: " + value);
//});

React.renderComponent(<HelloMessage settings={window.settings} />, document.getElementById('content'));
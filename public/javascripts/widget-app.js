/** @jsx React.DOM */
var HelloMessage = React.createClass({
    render: function() {

        return <div className="note-widget spiral-note">
                    <div className="note-header"></div>
                    <div className="note-content">
                        Hello {this.props.settings.test}
                    </div>
               </div>;
    }
});

Wix.addEventListener(Wix.Events.SETTINGS_UPDATED, function(json){
    console.log(json.test);
});

React.renderComponent(<HelloMessage settings={window.settings} />, document.getElementById('content'));
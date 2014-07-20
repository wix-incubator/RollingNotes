/** @jsx React.DOM */
var HelloMessage = React.createClass({
    render: function() {
        return <div>Hello {this.props.settings.test}</div>;
    }
});

Wix.addEventListener(Wix.Events.SETTINGS_UPDATED, function(json){
    console.log(json.test);
});

React.renderComponent(<HelloMessage settings={window.settings} />, document.getElementById('content'));
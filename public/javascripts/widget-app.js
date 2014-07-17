/** @jsx React.DOM */
var HelloMessage = React.createClass({
    render: function() {
        return <div>Hello {this.props.settings.test}</div>;
    }
});

React.renderComponent(<HelloMessage settings={window.settings} />, document.getElementById('content'));
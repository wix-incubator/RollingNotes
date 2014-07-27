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

//for wix-model updates
Wix.addEventListener(Wix.Events.SETTINGS_UPDATED, function(json){
    console.log('Successful Update!');
    console.log(json);
});


//Wix.UI.onChange('*', function(value, key){
//    console.log('I CHANGED!!');
//    console.log('Key: ' + key + ", val: " + value);
//});

React.renderComponent(<HelloMessage settings={window.settings} />, document.getElementById('content'));
/**
 * Created by elanas on 7/14/14.
 */

// returns default settings/widget instance

exports.component = {
    "design" : {
        "template" : "default-note",
        "text" : {
            "color" : "",
            "size:" : "",
            "family": "",
            "style" : "",
            "alignment" : "ltr"
        },
        "background" : {
            "color" : "",
            "opacity" : "100"
        },
        "hover" : {
            "on" : "false",
            "color" : "",
            "opacity" : ""
        },
        "border" : {
            "color" : "",
            "width" : "",
            "radius" : ""
        }
    },

    "transition" : {
        "effect" : "typewriter",
        "preview" : "false",
        "duration" : "1"
    },


    "notes":[]
};
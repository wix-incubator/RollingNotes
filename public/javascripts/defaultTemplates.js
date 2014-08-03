/**
 * Created by elanas on 7/14/14.
 */

// returns default settings/widget instance


exports.defaultNote = {
    "design" : {
        "template" : "default-note",
        "text" : {
            "color" : "#ff7766",
            "preset": "Body-L",
            "size:" : "",
            "family": "",
            "style" : {
                "bold": "",
                "italic": "",
                "underline": ""
            },
            "alignment" : "ltr"
        },
        "background" : {
            "color" : "rgba(255,255,255,1)",
            "opacity" : "100"
        },
        "hover" : {
            "on" : false,
            "color" : "rgba(255,255,255,1)",
            "opacity" : "100"
        },
        "border" : {
            "color" : "#30366b",
            "width" : "4",
            "radius" : "0"
        }
    },

    "transition" : {
        "effect" : "fade",
        "preview" : "false",
        "duration" : "1"
    },

    "notes":[]
};

exports.spiralNote = {
    "design" : {
        "template" : "spiral-note",
        "text" : {
            "color" : "#000000",
            "preset": "Body-L",
            "alignment" : "ltr"
        },
        "background" : {
            "color" : "rgba(255,255,255,1)",
            "opacity" : "100"
        },
        "hover" : {
            "on" : false,
            "color" : "rgba(255,255,255,1)",
            "opacity" : "100"
        },
        "border" : {
            "color" : "#d2e2ff",
            "width" : "0",
            "radius" : "6"
        }
    },

    "transition" : {
        "effect" : "fade",
        "preview" : "false",
        "duration" : "1"
    },

    "notes":[]
};


exports.postitNote = {
    "design" : {
        "template" : "postit-note",
        "text" : {
            "color" : "#000000",
            "preset": "Body-L",
            "alignment" : "ltr"
        },
        "background" : {
            "color" : "rgba(251,239,172,1)",
            "opacity" : "100"
        },
        "hover" : {
            "on" : false,
            "color" : "rgba(255,255,255,1)",
            "opacity" : "100"
        },
        "border" : {
            "color" : "#C8B26B",
            "width" : "0",
            "radius" : "3"
        }
    },
    "transition" : {
        "effect" : "fade",
        "preview" : "false",
        "duration" : "1"
    },

    "notes":[]
};


exports.chalkboardNote = {
    "design" : {
        "template" : "chalkboard-note",
        "text" : {
            "color" : "#FFFFFF",
            "preset": "Body-L",
            "alignment" : "ltr"
        },
        "background" : {
            "color" : "rgba(72,104,35,1)",
            "opacity" : "100"
        },
        "hover" : {
            "on" : false,
            "color" : "rgba(255,255,255,1)",
            "opacity" : "100"
        },
        "border" : {
            "color" : "#FFFFFF",
            "width" : "8",
            "radius" : "8"
        }
    },

    "transition" : {
        "effect" : "fade",
        "preview" : "false",
        "duration" : "1"
    },

    "notes":[]
};
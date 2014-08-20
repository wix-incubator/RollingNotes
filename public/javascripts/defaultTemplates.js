
/********************************************************************
 * DEFAULT NOTE TEMPLATES
 *
 * Includes four pre-loaded note templates.
 * Each template is exported to be used in settings-app to load widget.
 *
 ********************************************************************/


/* Note template that corresponds to user's site color scheme  */
exports.defaultNote = {
    "design" : {
        "template" : "defaultNote",
        "text" : {
            "color" : "color-1",
            "preset": "Body-L",
            "alignment" : "center"
        },
        "background" : {
            "color" : "color-8",
            "opacity" : "1"
        },
        "hover" : {
            "selected" : true,
            "color" : "color-9",
            "opacity" : "1"
        },
        "border" : {
            "color" : "color-6",
            "width" : "4",
            "radius" : "0"
        }
    },

    "transition" : {
        "effect" : "fade",
        "preview" : "false",
        "duration" : "2"
    },

    "notes":[]
};

/* Note template that looks like a spiral notepad  */
exports.spiralNote = {
    "design" : {
        "template" : "spiralNote",
        "text" : {
            "color" : "#000000",
            "preset": "Body-L",
            "alignment" : "center"
        },
        "background" : {
            "color" : "rgba(255,255,255,1)",
            "opacity" : "1"
        },
        "hover" : {
            "selected" : true,
            "color" : "rgba(175,204,255,1)",
            "opacity" : "1"
        },
        "border" : {
            "color" : "#505C73",
            "width" : "0",
            "radius" : "6"
        }
    },

    "transition" : {
        "effect" : "fade",
        "preview" : "false",
        "duration" : "2"
    },

    "notes":[]
};

/* Note template that looks like a postit note */
exports.postitNote = {
    "design" : {
        "template" : "postitNote",
        "text" : {
            "color" : "#000000",
            "preset": "Body-L",
            "alignment" : "center"
        },
        "background" : {
            "color" : "rgba(251,239,172,1)",
            "opacity" : "1"
        },
        "hover" : {
            "selected" : true,
            "color" : "rgba(251,227,97,1)",
            "opacity" : "1"
        },
        "border" : {
            "color" : "#3f3a26",
            "width" : "0",
            "radius" : "3"
        }
    },
    "transition" : {
        "effect" : "fade",
        "preview" : "false",
        "duration" : "2"
    },

    "notes":[]
};

/* Note template that looks like a chalkboard  */
exports.chalkboardNote = {
    "design" : {
        "template" : "chalkboardNote",
        "text" : {
            "color" : "#FFFFFF",
            "preset": "Body-L",
            "alignment" : "center"
        },
        "background" : {
            "color" : "rgba(72,104,35,1)",
            "opacity" : "1"
        },
        "hover" : {
            "selected" : true,
            "color" : "rgba(94,141,48,1)",
            "opacity" : "1"
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
        "duration" : "2"
    },

    "notes":[]
};
/**
 * Created by elanas on 7/14/14.
 */

// returns default settings/widget instance
//
//exports.component = {
//    "design" : {
//        "template" : "default-note",
//        "text" : {
//            "color" : "",
//            "size:" : "",
//            "family": "",
//            "style" : {
//                bold: "",
//                italic: "",
//                underline: ""
//            },
//            "alignment" : "ltr"
//        },
//        "background" : {
//            "color" : "",
//            "opacity" : "100"
//        },
//        "hover" : {
//            "on" : "false",
//            "color" : "",
//            "opacity" : ""
//        },
//        "border" : {
//            "color" : "",
//            "width" : "",
//            "radius" : ""
//        }
//    },
//
//    "transition" : {
//        "effect" : "typewriter",
//        "preview" : "false",
//        "duration" : "1"
//    },
//
//
//    "notes":[]
//};


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
            "on" : "true",
            "color" : "rgba(255,255,255,1)",
            "opacity" : "100"
        }, "border" : {
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



'{ "template" : "default-note", "text" : { "color" : "#ff7766", "preset": "Body-L", "size:" : "", "family": "", "style" : { "bold": "", "italic": "", "underline": "" }, "alignment" : "ltr" }, "background" : { "color" : "rgba(255,255,255,1)", "opacity" : "100" }, "hover" : { "on" : "false", "color" : "rgba(255,255,255,1)", "opacity" : "100" }, "border" : { "color" : "#30366b", "width" : "4", "radius" : "0" }}';
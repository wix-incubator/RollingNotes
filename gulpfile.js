
/********************************************************************
 * Gulp Build File
 *
 * Creates a distribution folder with minified and
 * concatenated scripts.
 *
 * Uses Gulp + Gulp plug-ins to build application.
 * Each task represents a separate build task to be
 * run by Gulp with the command 'gulp build'
 *
 * Individual tasks are run with the command: 'gulp 'task-name''
 *
 ********************************************************************/

var gulp = require('gulp');
var concat = require('gulp-concat');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var prefix = require('gulp-autoprefixer');
var minifyCSS = require('gulp-minify-css');
var clean = require('gulp-clean');
var react = require('gulp-react');
var browserify = require('gulp-browserify');
var imagemin = require('gulp-imagemin');
var pngcrush = require('imagemin-pngcrush');
var gzip = require('gulp-gzip');

/*lint task -- checks javascripts for errors*/
gulp.task('lint', function() {
    gulp.src([
        './public/javascripts/settings-app.js'
//        './public/javascripts/widget-app.js'
    ])
        .pipe(react())
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(jshint.reporter('fail'));
});

/*clean task -- deletes all files in the*/
gulp.task('clean', function() {
    gulp.src('./dist/*')
        .pipe(clean({force: true}));
});

/*minfiy-css -- compiles less files, adds browser prefixes, minifies the css */
gulp.task('minify-css', function() {
    var opts = {comments:true,spare:true};
    gulp.src([
        './public/stylesheets/*.css',
        "./public/javascripts/bower_components/wix-ui-lib2/ui-lib.min.css"
    ])
        .pipe(prefix("last 1 version", "> 1%", "ie 8", "ie 7"))
        .pipe(minifyCSS(opts))
        .pipe(gulp.dest('./dist/stylesheets'));
});

/*settingsBundle -- browserifies, concats, and minifies settings-app files */
gulp.task('settingsBundle', function() {
    gulp.src([
        "public/javascripts/settings-app.js",
    ])
        .pipe(browserify({
            insertGlobals: true,
            debug: true
        }))
        .pipe(concat("settingsBundle.js"))
        .pipe(uglify())
        .pipe(gulp.dest('dist/javascripts/'));
});

gulp.task('settingsBundleGzip', function() {
    gulp.src([
        "public/javascripts/settings-app.js",
    ])
        .pipe(browserify({
            insertGlobals: true,
            debug: true
        }))
        .pipe(concat("settingsBundle.js"))
        .pipe(uglify())
        .pipe(gzip())
        .pipe(gulp.dest('dist/javascripts/'));
});


/*bowerComponents -- concats and minifies bower components relavant to settings-app*/
gulp.task('bowerComponents', function() {
      gulp.src([
         "public/javascripts/bower_components/jquery/dist/jquery.min.js",
         "public/javascripts/bower_components/jqueryui/jquery-ui.min.js",
         "public/javascripts/bower_components/angular/angular.min.js",
         "public/javascripts/bower_components/angular-ui-sortable/sortable.min.js",
          "public/javascripts/bower_components/wix-ui-lib2/ui-lib.js",
          "public/javascripts/bower_components/angular-mailto/angular-mailto.js",
          "public/javascripts/bower_components/deep-diff/releases/deep-diff-0.2.0.min.js",
          "publi/javascripts/bower_components/angular-animate/angular-animate.js",
          "public/javascripts/bower_components/lodash/dist/lodash.js",
          "public/javascripts/bower_components/slimScroll/jquery.slimscroll.js",
     ])
         .pipe(concat("bowerComponents.js"))
         .pipe(uglify())
         .pipe(gulp.dest('dist/javascripts/'));
});

/*widgetBundle -- JSX transforms, concatenates and minfies files related to widget*/
gulp.task('widgetBundle', function() {
    gulp.src([
        "public/javascripts/bower_components/jquery/dist/jquery.min.js",
        "public/javascripts//bower_components/react/react-with-addons.js",
        "public/javascripts/bower_components/react/JSXTransformer.js",
        "public/javascripts/bower_components/visibilityjs/lib/visibility.core.js",
        "public/javascripts/bower_components/visibilityjs/lib/visibility.timers.js",
        "public/javascripts/widget-app.js"
    ])
        .pipe(react())
        .pipe(concat("widgetBundle.js"))
        .pipe(uglify())
        .pipe(gulp.dest('./dist/javascripts/'));
});

/*minify-images -- minfies images and puts in proper folder*/
gulp.task('minify-images', function () {

    /*minify images that go in /public/images */
    gulp.src([
        './public/images/*'
    ])
        .pipe(imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngcrush()]
        }))
        .pipe(gulp.dest('dist/images'));


    /*minify wix ui lib images that go in /public/stylesheets/images */
    gulp.src([
        './public/javascripts/bower_components/wix-ui-lib2/images/**'
    ])
        .pipe(imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngcrush()]
        }))
        .pipe(gulp.dest('dist/stylesheets/images/'));
});


// build -- complete build build task
gulp.task('build',
    ['lint', 'minify-css', "minify-images", 'bowerComponents', 'settingsBundle', 'widgetBundle']
);
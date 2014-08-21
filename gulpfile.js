var gulp = require('gulp');
var concat = require('gulp-concat');

// plugins
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var minifyCSS = require('gulp-minify-css');
var clean = require('gulp-clean');



var react = require('gulp-react');
var browserify = require('gulp-browserify');

var imagemin = require('gulp-imagemin');
var pngcrush = require('imagemin-pngcrush');


// tasks
gulp.task('lint', function() {
    gulp.src(['./public/javascripts/settings-app.js', '!./public/javascripts/bower_components/**'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(jshint.reporter('fail'));
});

gulp.task('clean', function() {
    gulp.src('./dist/*')
        .pipe(clean({force: true}));
});

gulp.task('minify-css', function() {
    var opts = {comments:true,spare:true};
    gulp.src([
        './public/stylesheets/*.css',
        "./public/javascripts/bower_components/wix-ui-lib2/ui-lib.min.css"
    ])
        .pipe(minifyCSS(opts))
        .pipe(gulp.dest('./dist/stylesheets'));
});

gulp.task('minify-js', function() {
    gulp.src(['./public/javascripts/settings-app.js', '!./public/javascripts/bower_components/**'])
        .pipe(uglify({
            // inSourceMap:
            // outSourceMap: "app.js.map"
        }))
        .pipe(gulp.dest('./dist/'))
});


gulp.task('copy-html-files', function () {
    gulp.src('./views/*.ejs')
        .pipe(gulp.dest('dist/views'));
});

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

gulp.task('minify-images', function () {
    return gulp.src('./public/images/*')
        .pipe(imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngcrush()]
        }))
        .pipe(gulp.dest('dist/images'));
});


// default task
gulp.task('default',
    ['lint']
);

// build task
gulp.task('build',
    ['lint', 'minify-css', "minify-images", 'bowerComponents', 'settingsBundle', 'widgetBundle', 'copy-html-files']
);
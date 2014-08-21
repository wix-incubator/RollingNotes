var gulp = require('gulp');
var browserify = require('gulp-browserify');
var concat = require('gulp-concat');

// plugins
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var minifyCSS = require('gulp-minify-css');
var clean = require('gulp-clean');

var browserify = require('gulp-browserify');


var mainBowerFiles = require('main-bower-files');

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
    gulp.src(['./public/stylesheets/*.css', '!./app/bower_components/**'])
        .pipe(minifyCSS(opts))
        .pipe(gulp.dest('./dist/'))
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
        .pipe(gulp.dest('dist/'));
});
//
//<script type="text/javascript" src="javascripts/bower_components/jqueryui/jquery-ui.min.js"></script>
//    <script type="text/javascript" src="//sslstatic.wix.com/services/js-sdk/1.33.0/js/Wix.js"></script>
//    <script type="text/javascript" src="javascripts/bower_components/angular/angular.min.js"></script>
//    <script type="text/javascript" src="javascripts/bower_components/angular-ui-sortable/sortable.min.js"></script>
//    <script type="text/javascript" src="/javascripts/bower_components/wix-ui-lib2/ui-lib.js"></script>
//    <script type="text/javascript" src="/javascripts/bower_components/angular-mailto/angular-mailto.js"></script>
//    <script type="text/javascript" src="/javascripts/bower_components/visibilityjs/lib/visibility.core.js"></script>
//    <script type="text/javascript" src="/javascripts/bower_components/visibilityjs/lib/visibility.timers.js"></script>
//    <script type="text/javascript" src="/javascripts/bower_components/deep-diff/releases/deep-diff-0.2.0.min.js"></script>
//    <script type="text/javascript" src="/javascripts/bower_components/angular-animate/angular-animate.js"></script>
//    <script type="text/javascript" src="/javascripts/bower_components/lodash/dist/lodash.js"></script>
//    <script type="text/javascript" src="/javascripts/bower_components/slimScroll/jquery.slimscroll.js"></script>
//    <script type="text/javascript" src="/javascripts/settings-bundle.js"></script>
gulp.task('bowerFiles', function() {
      gulp.src([
         "public/javascripts/bower_components/jquery/dist/jquery.min.js",
         "public/javascripts/bower_components/jqueryui/jquery-ui.min.js",
         "public/javascripts/bower_components/angular/angular.min.js"


     ])
         .pipe(concat("bower-bundle.js"))
         .pipe(uglify())
         .pipe(gulp.dest('dist/'));
});

// default task
gulp.task('default',
    ['lint']
);

// build task
gulp.task('build',
    ['lint', 'minify-css', 'minify-js',  'copy-html-files']
);
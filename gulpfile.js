var gulp = require('gulp');
var browserify = require('gulp-browserify');
var concat = require('gulp-concat');


// plugins
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var minifyCSS = require('gulp-minify-css');
var clean = require('gulp-clean');

var browserify = require('gulp-browserify');
var concat = require('gulp-concat');

gulp.task('default', function() {
    // place code for your default task here
});

gulp.task('browserify', function() {
    gulp.src(['./public/javascripts/settings-app.js'])
        .pipe(browserify({
            insertGlobals: true,
            debug: true
        }))
        .pipe(concat('bundled.js'))
        .pipe(gulp.dest('./app/js'))
});


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
gulp.task('copy-bower-components', function () {
    gulp.src('./public/javascripts/bower_components/**')
        .pipe(gulp.dest('dist/bower_components'));
});
gulp.task('copy-html-files', function () {
    gulp.src('./views/*.ejs')
        .pipe(gulp.dest('dist/'));
});


// default task
gulp.task('default',
    ['lint']
);
// build task
gulp.task('build',
    ['lint', 'minify-css', 'minify-js', 'copy-html-files', 'copy-bower-components']
);
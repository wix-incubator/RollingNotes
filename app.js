/*****************************
 * Node express app, initializes routes and database
 * uses angular for settings front end and react for widget front end
 *****************************/
var DEV = 'dev';
var PROD = 'prod';

var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var connect = require('connect');
var compression = require('compression')

var routes = require('./routes/index');

var app = express();

//authenticate with wix
var auth = require('./authenticate');

/**
 * To run widget in development environment: type 'NODE_ENV=dev npm start' or 'npm start' in terminal with no quotations.
 *
 * To run widget in production environment: type 'NODE_ENV=prod npm start' in terminal with no quotations
 */
if (process.env.NODE_ENV === PROD) {
    app.set('views', path.join(__dirname, 'dist/views'));
    app.set('view engine', 'ejs')
    app.use(require('less-middleware')(path.join(__dirname, 'dist')));
    app.use(express.static(path.join(__dirname, 'dist')));
} else {
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs')
    app.use(require('less-middleware')(path.join(__dirname, 'public')));
    app.use(express.static(path.join(__dirname, 'public')));
}
app.use(compression());
app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());


//TODO authenticate ONCE for each request
// Add Wix authentication to each server request
app.use(function(req, res, next){
    auth.authenticate(req, res);
    next();
});

app.use('/', routes);



/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;

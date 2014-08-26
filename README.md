Rolling Notes - Wix Third Party App
=====

About
-----
This is a sample Third Party Application (TPA) made for the Wix App Market. It provides an example of a production-ready TPA built with a Node.js backend as well as an AngularJS and ReactJS frontend. 

Intro
-----
Rolling Notes is a simple Wix widget TPA that displays a sequence of notes that play in an animated loop. The user is able to customize the visual appearance of the note as well as the transition effect. 

This project is set to work on your local machine using express.js node server and a local MongoDB database.

Setup
----- 
How To Install


After downloading or cloning the app to your local drive, in your command prompt navigate to the root "rolling-notes" folder. 

 Make sure you have npm, node and MongoDB installed globally with the following commands:
> node -v  
> npm -v  
> bower -v  
> gulp -v  
> mongo --version  

If not, make sure to install the latest versions of each globally. 

Install the node package dependencies using the following command:

> npm install

And then install all the bower components for the UI:

> bower install

Begin Server
----- 
Before running the server, make sure to run your mongodb database with the command:
> mongod  

The app can be run in a development or production environment. 

To run in dev mode, run the following command: 

> npm start

To run in production mode, first update the distribution folder by running the following gulp commands:

> gulp clean
> gulp build

Then to run the server, enter the following command:

> NODE_ENV=prod npm start

Run App
----- 
To begin using the app, first register an account at [dev.wix.com](http://dev.wix.com/).

Then follow the site instructions to create a new widget app. Set the following settings in "Register Your App" page. 

 - App Endpoints: 'Widget'
 - Set App Endpoints:
	 - Widget URL: http://localhost:8000/widget
	 - Default width: 300
	 - Default height: 300
 - Set App Settings Endpoints:
	 - Settings URL: http://localhost:8000/settings
	 - Default width: 600
	 - Default height: 750

Then click save and continue. You are now free to click the "Test Your App" button. In order to load the app, click the "App Market" button once the test site is loaded. Then select the "Developer Apps" tab from the left sidebar and add the rolling notes app to the site. 

Make sure your server is running as described above.   


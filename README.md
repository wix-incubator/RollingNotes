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

Registering and Running the App
----- 
1. Go to [Wix Developer Center](http://dev.wix.com/) and click "add your app".
2. Enter a name for the app, for example "RollingNotes", and click "register".
3. Copy the app-key and app-secret-key to config.js (in the RollingNotes folder). 
4. Create a new widget app and set the following settings in "Register Your App" page.
 - App Endpoints: 'Widget'
 - Set App Endpoints:
	 - Widget URL: http://localhost:8000/widget
	 - Default width: 300
	 - Default height: 300
 - Set App Settings Endpoints:
	 - Settings URL: http://localhost:8000/settings
	 - Default width: 600
	 - Default height: 750

5. Click "save" or "save and continue". 

You are now ready to run the RollingNotes app. 

1. Click the "Test Your App" button. Then a new browser tab will open with the Wix Editor, and you should see the RollingNotes app in the On the "Developer Apps" tab.
2.  Add the RollingNotes app to the site.
3.  Double click the app to open settings

Make sure your server (both NoteJS & MongoDB) is running as described above.

'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const request = require('request');
const schedule = require('node-schedule');
require('dotenv').config();

const cookieParser = require('cookie-parser');
const session = require('express-session');

// firebase config
const firebase = require('firebase');

var config = {
    apiKey: process.env.APIKEY,
    authDomain: process.env.AUTHDOMAIN,
    databaseURL: process.env.DBURL,
    projectId: process.env.PROJECTID,
    storageBucket: process.env.STORAGEBCKT,
    messagingSenderId: process.env.MSID
  };

var fbapp = firebase.initializeApp(config);
var db = fbapp.database();
var auth = fbapp.auth();

// keepalive ping hacks
function rememberMyServer(uri) {
 	https.get(uri, (resp) => {
 		console.log(uri + ' - alive!');
 	}).on('error', (err) => {
 		console.log(uri + ' - dead! emergency!');
 	});
}

var keepalive = schedule.scheduleJob('*/2 * * * *', function() {

	var allMyServers = ['https://DearestDaringApplescript--rounak.repl.co'];
	for(var i = 0; i < allMyServers.length; i++) {
		rememberMyServer(allMyServers[i]);
	}
})

// app body-parser config
const app = express()

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

app.use(express.static(path.resolve(`${__dirname}/web/public`)));
console.log(`${__dirname}/web`);
app.use('*', (req, res, next) => {
  console.log(`URL: ${req.baseUrl}`);
  next();
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept,X-access-token');
  next();
});

app.use((err, req, res, next) => {
  if (err) {
    res.send(err);
  }
});

app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.use(express.static(__dirname + '/views/web/public'));

// app cookie-parser config
app.use(cookieParser());
app.use(session({secret: 'mEsSiTuP'}));

// APIs start here
// home page
app.get('/', (req, res) => {
  return res.send('200 OK : Welcome Home');;
});

// logout API
app.get('/logout', function(req, res) {
	auth.signOut();
	res.clearCookie('currentUser');
	return res.send("200 OK : Logged out successfully");
});

// get hostels data
app.get('/get/hostel/:gender', function(req, res) {

  var messData = [];

  db.ref().child('hostels').child(req.params.gender).once('value')
  .then( snapshot => {
    snapshot.forEach(function(childSnapshot) {
    	let newJSON = {};
    	newJSON["hostelName"] = childSnapshot.key;
    	newJSON["messName"] = childSnapshot.val();
    	messData.push(newJSON);
    });
    return res.send(messData);
  });

});

// get mess menu data
app.get('/get/mess/menu', function(req, res) {

  db.ref().child("mess").child("menu").once("value")
  .then( snapshot => {
    return res.send(snapshot);
  });

});

// register API (irrelevant)
app.get('/register', function(req, res) {
	if (req.body.uid.length == 28) {
		return res.redirect('/userdashboard');
	} else {
		return res.send('200 OK : Please register');
	}
});

app.post('/register', function(req, res) {
	var email = req.body.email;
	var pwd = req.body.pwd;

	auth.createUserWithEmailAndPassword(email, pwd)
	.then(function(userData) {

    var registerData = {
      'studentName': req.body.studentName,
      'studentEmail': req.body.email,
      'hostelName': req.body.hostelName,
      'studyYear': req.body.studyYear,
      'messName': req.body.messName
    };

    db.ref().child('data').child(req.body.messName).child(req.body.hostelName).push().set(registerData);



		console.log('registering and logging in');
		res.cookie('currentUser', auth.currentUser);
		return res.send(auth.currentUser);
	})
	.catch(function(error) {
		if (error) {
      return res.send(error);
		}
	});
});

// login API (irrelevant)
app.get('/login', function(req, res) {
	if (req.cookies.currentUser) {
		return res.redirect('/userdashboard');
	} else {
		return res.send('200 OK : Please login');;
	}
});

app.post('/login', function(req, res) {
	var email = req.body.email;
	var pwd = req.body.pwd;

	auth.signInWithEmailAndPassword(email, pwd)
	.then(function(userData) {
		console.log('logging in');
		res.cookie('currentUser', auth.currentUser);
		return res.send(auth.currentUser);
	})
	.catch(function(error) {
		if (error) {
			console.log(error.message);
			return res.send('Error 404 : Wrong credentials')
		}
	});
});

// user dashboard
app.post('/userdashboard', function(req, res) {
	if (req.body.uid.length == 28) {
		return res.send('200 OK : Welcome to Dashboard');
	} else {
		return res.send('Error 401 : Unauthorized');
	}
});

// server settings
var server = http.createServer(app);

server.listen(4000, function () {
  console.log('Port 4000 - MessItUp')
});
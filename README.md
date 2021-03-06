MeetMeet
========
An automated meeting scheduler between two mutual Facebook friends based on mutual free time.

###Tech stack

- Meteor.js
- OAuth integrations
   - Facebook
   - Google Calendar
   - Yelp Search

##Installation

Install meteorite

``` sh
$ sudo -H npm install -g meteorite
```

Clone from github

``` sh
$ git clone https://github.com/marklee22/meetmeet.git
$ cd MeetMeet
```

Run meteor

``` sh
$ mrt
```
    
Browse to localhost:3000

##Configuration
1. Create Facebook API Application [here](https://dev.twitter.com/).
1. Create Yelp API Application [here](http://www.yelp.com/developers/getting_started/api_access)
1. Create Google OAuth Application [here](https://code.google.com/apis/console)
   1. Enable maps and calendar APIs
   2. Replace maps API key in google script tag
1. Insert account credentials into database for OAuth

``` sh
$ meteor mongo
MongoDB shell version: 2.4.3
connecting to: 127.0.0.1:3002/meteor
> db.meteor_accounts_loginServiceConfiguration.insert({
    "service" : "google",
    "clientId" : "YOUR_CLIENT_ID",
    "secret" : "YOUR_CLIENT_SECRET"
})
> db.meteor_accounts_loginServiceConfiguration.insert({
    "service" : "google",
    "appId" : "YOUR_APP_ID",
    "secret" : "YOUR_APP_SECRET"
})
> db.meteor_accounts_loginServiceConfiguration.insert({
   "service" : "yelp",
   "consumerKey" : "YOUR_CONSUMER_KEY",
   "consumerSecret" : "YOUR_CONSUMER_SECRET",
   "accessToken" : "YOUR_ACCESS_TOKEN",
   "accessTokenSecret" : "YOUR_ACCESS_TOKEN_SECRET"
})
```

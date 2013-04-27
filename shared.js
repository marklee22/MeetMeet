// Google calendars
Calendars = new Meteor.Collection('calendars');

// Calendar events
Events = new Meteor.Collection('events');

// Facebook friends
Friends = new Meteor.Collection('friends');

// Geolocation of users
// TODO: Move this to Users table instead
Locations = new Meteor.Collection('locations');

// Meetings between two users
Meetings = new Meteor.Collection('meetings');
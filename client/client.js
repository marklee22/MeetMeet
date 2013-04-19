Meteor.subscribe('userData');

/** Handler for getAllCalendars HTTP request **/
var handleCalendarResults = function(err, data) {
  if(err) console.log(err);

  // Process each calendar returned
  var calendars = JSON.parse(data.content).items;
  var calendarArray = [];
  _.each(calendars, function(item) {
    // Change the default calendar name to primary
    if(item.primary)
      item.summary = 'Primary';
    calendarArray.push({id: item.id, summary: item.summary});
  });

  // Store these calendars in the database


  // Notify the template to show the calendars to select
  Session.set('select_calendars', true);
  Session.set('gCalendars', calendarArray);
};

/** Download all calendars from the user **/
var getAllCalendars = function(params) {
  var url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
  params['maxResults'] = 10;

  console.log(params);

  Meteor.http.get(url, {params: params}, handleCalendarResults);
};

// var getCalendarEvent  = function() {
//   var url = "https://www.googleapis.com/calendar/v3/calendars/primary";
//   var params = {
//     access_token: Meteor.user().services.google.accessToken,
//     part: "snippet",
//     mine: "true"
//   };

//   Meteor.http.get(url, {params: params}, function(err, result) {
//     console.log(err);
//     console.log(result);
//     console.log(JSON.parse(result.content));
//   });
// };

/** Google Calendar Init to process downloading GCal data **/
var gCalendarInit = function() {
  // Make sure a User is logged in before calling Google API
  if(Meteor.user() && !Meteor.loggingIn()) {
    console.log(Meteor.user());
    var params = {
      access_token: Meteor.user().services.google.accessToken,
      part: "snippet",
      mine: "true"
    };
    Meteor.loginWithGoogle({
      requestPermissions: [
        'https://www.googleapis.com/auth/calendar'
        ]
    }, function() {
      getAllCalendars(params);
    });
  }
};


/****************
*** TEMPLATES ***
****************/

Template.gCalendars.select_calendars = function() {
  return Session.get('select_calendars');
};

Template.gCalendars.calendars = function() {
  return Session.get('gCalendars');
};

Template.hello.greeting = function () {
  return "Welcome to friendster.";
};

Template.hello.events({
  'click input' : function () {
    gCalendarInit();
    // template data, if any, is available in 'this'
    if (typeof console !== 'undefined')
      console.log("You pressed the button");
  }
});
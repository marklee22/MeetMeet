Meteor.subscribe('userData');
Meteor.subscribe('calendarData');

/*********************
*** GCAL FUNCTIONS ***
*********************/

/** Handler for getAllCalendars HTTP request **/
var handleCalendarResponse = function(err, data) {
  if(err) console.log('Calendar err: ', err);

  // Process each calendar returned
  var calendars = data.data.items;
  var calendarArray = [];
  _.each(calendars, function(item) {
    // Change the default calendar name to primary
    if(item.primary) {
      item.summary = 'Primary';
      item.id = 'primary';
    }
    calendarArray.push({gCalId: item.id, summary: item.summary});
  });

  // Store these calendars in the database
  Meteor.call('setCalendars', Meteor.userId(), calendarArray, function(err, res){
    if(err) console.log('err - ', err);
    console.log('result - ',res);
  });

  // Notify the template to show the calendars to select
  Session.set('select_calendars', true);
  Session.set('gCalendars', calendarArray);
};

/** Download all calendars from the user **/
var getAllCalendars = function(params) {
  var url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
  params['maxResults'] = 10;

  console.log(params);

  Meteor.http.get(url, {params: params}, handleCalendarResponse);
};

var handleEventsResponse = function(err, data) {
  if(err) console.log('Events err:', err);

  var rawEvents = data.data.items;
  var events = [];

  _.each(rawEvents, function(event) {
    events.push({
      start: event.start.dateTime,
      end: event.end.dateTime,
      recurrence: event.recurrence,
      htmlLink: event.htmlLink,
      status: event.status,
      gEventId: event.id,
      summary: event.summary
    });
  });

  // Store events in the database
  Meteor.call('setEvents', Meteor.userId(), events, function(err, result) {
    console.log('wrote new events: ', result);
  });

  // Set Session variable
  Session.set('imported_events', true);
  Session.set('gEvents', events);
};

var getEvents = function(params) {
  var url = 'https://www.googleapis.com/calendar/v3/calendars/';

  // Retrieve selected calendars only
  Meteor.call('getCalendars', true, function(err, results) {
    if(err) console.log('err - ', err);
    calendars = results;
    console.log(calendars);
    var minDate = moment().format('YYYY-MM-DDTHH:mm:ss') + 'Z';
    var maxDate = moment().add('days', 7).format('YYYY-MM-DDTHH:mm:ss') + 'Z';

    var params = {
      access_token: Meteor.user().services.google.accessToken,
      part: "snippet",
      mine: "true",
      timeMin: minDate,
      timeMax: maxDate
    };

    Meteor.http.get(url + results[0].gCalId + '/events', {params: params}, handleEventsResponse);
  });
};

/** Google Calendar Init to process downloading GCal data **/
var gCalendarInit = function(func) {
  // Make sure a User is logged in before calling Google API
  if(Meteor.user() && !Meteor.loggingIn()) {
    // console.log(Meteor.user());
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
      func(params);
    });
  }
};

/*************************
*** Facebook Functions ***
*************************/

var handleFbookFriendsResponse = function(err, data) {
  if(err) console.log('fbook friend err: ', err);

  var friends = data.data.data;
  Meteor.call('setFriends', Meteor.userId(), friends, function(err, result) {
    if(err) console.log('setFriends err: ', err);
  });

  Session.set('select_friends', true);
  Session.set('friends', friends);
};

var getFbookFriends = function(params) {
  var url = 'https://graph.facebook.com/me/friends';

  Meteor.http.get(url, {params: params}, handleFbookFriendsResponse);
};

var fbookInit = function(func) {
  if(Meteor.user() && !Meteor.loggingIn()) {
    // console.log(Meteor.user());
    var params = {
      access_token: Meteor.user().services.facebook.accessToken
    };
    Meteor.loginWithFacebook({
      requestPermissions: [
        ''
        ]
    }, function() {
      func(params);
    });
  }
};


/****************
*** TEMPLATES ***
****************/

Template.dataButtons.events({
  'click button.gCal.getCalendars': function() {
    gCalendarInit(getAllCalendars);
  },

  'click button.gCal.getEvents': function() {
    gCalendarInit(getEvents);
  },

  'click button.fbook.getFriends': function() {
    fbookInit(getFbookFriends);
  }
});

Template.friend.events({
 'click .slider-button': function(e) {
  console.log(e,$(e.target));
    $(e.target).toggle(function() {
      $(e.target).addClass('on').html('Quizz');
    },function(){
      $(e.target).removeClass('on').html('Read');
    });
  }
});

Template.fbookFriends.select_friends = function() {
  return Session.get('select_friends');
};

Template.fbookFriends.friends = function() {
  return Session.get('friends');
};

Template.gCalendars.imported_events = function() {
  return Session.get('imported_events');
};

Template.gCalendars.events = function() {
  return Session.get('gEvents');
};

Template.gCalendars.select_calendars = function() {
  return Session.get('select_calendars');
};

Template.gCalendars.calendars = function() {
  return Session.get('gCalendars');
};



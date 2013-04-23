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

/*************
*** ROUTER ***
*************/

Meteor.Router.add({
  '/': 'main_page',
  '/calendar': 'calendar_page',
  '/friends': 'friends_page',
  '/about': 'about_page',
  '/FAQ': 'faq_page',
  '/map': 'map_page',
  '/signup': 'signup_page',
  '/forgot_password': 'forgot_password_page'
});

Meteor.Router.filters({
  'checkLoggedIn': function(page) {
    if(Meteor.loggingIn()) {
      return 'loading_page';
    } else if(Meteor.user()) {
      return page;
    } else {
      return 'signin_page';
    }
  }
});

Meteor.Router.filter('checkLoggedIn', {only: ['main_page', 'friends_page', 'map_page', 'calendar_page']});

/****************
*** TEMPLATES ***
****************/

Template.page.currentPage = function() {
  return 'The current page is: ' + Meteor.Router.page();
};

Template.dataButtons.events({
  'click button.gCal.getCalendars': function() {
    gCalendarInit(getAllCalendars);
  },

  'click button.gCal.getEvents': function() {
    gCalendarInit(getEvents);
  }
});

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



Session.set('Date', new Date());

Meteor.autosubscribe(function () {
  if(Meteor.user()) {
    Meteor.subscribe('eventData');
    Meteor.subscribe('calendarData');
  }
});

Deps.autorun(function() {
  if(Meteor.user()) {
    console.log('in autorun');
    var calendars = Calendars.find({}).fetch();
    var events = Events.find({}).fetch();
    if(calendars) {
      Session.set('hasCalendars', true);
      Session.set('gCalendars', calendars);
    }
    if(events) {
      Session.set('gEvents', events);
      _.each(events, function(event) {
        // console.log(event);
        var foundEvent = $('#fullCalendar').fullCalendar('clientEvents', event._id);
        if(foundEvent.length > 0) {
          console.log('updating event');
          foundEvent.title = event.summary;
          foundEvent.start = event.start;
          foundEvent.end = event.end;
          foundEvent.url = event.htmlLink;
          foundEvent.allDay = event.allDay;
          $('#fullCalendar').fullCalendar('updateEvent', foundEvent);
        } else {
          console.log('inserting event');
          $('#fullCalendar').fullCalendar('addEventSource', [event]);
        }
      });
    }
  }
});

Template.full_calendar.hideCalPrefs = function() {
  return !Session.get('showCalPrefs');
};

Template.full_calendar.rendered = function() {
  $('#fullCalendar').empty();
  $('#fullCalendar').fullCalendar({
    header: {
      left: 'prev, next',
      center: 'title',
      right: 'agendaDay, agendaWeek, month'
    },
    weekMode: 'variable',
    eventDataTransform: function(event) {
      var newEvent = {};
      newEvent.id = event._id;
      newEvent.title = event.summary;
      newEvent.start = event.start;
      newEvent.end = event.end;
      newEvent.url = event.htmlLink;
      newEvent.allDay = event.allDay;
      return newEvent;
    }
  });
  console.log('# of events - ', Session.get('gEvents').length);
  if(Session.get('gEvents').length !== $('#fullCalendar').fullCalendar('clientEvents').length)
    $('#fullCalendar').fullCalendar('addEventSource', Session.get('gEvents'));
};

/****************************
*** GOOGLE CALENDAR FUNCS ***
****************************/

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
  Meteor.call('importCalendars', Meteor.userId(), calendarArray, function(err, res){
    if(err) console.log('err - ', err);
  });

  // Notify the template to show the calendars to select
  Session.set('selectCalendars', true);
};

/** Download all calendars from the user **/
var getAllCalendars = function(params) {
  var url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
  params['maxResults'] = 10;
  Meteor.http.get(url, {params: params}, handleCalendarResponse);
};

var handleEventsResponse = function(err, data) {
  if(err) console.log('Events err:', err);

  var rawEvents = data.data.items;
  var events = [];

  _.each(rawEvents, function(event) {
    console.log(event.start.dateTime);
    events.push({
      allDay: event.start.dateTime ? false : true,
      start: event.start.dateTime ? moment(event.start.dateTime).format('X') : moment(event.start.date).format('X'),
      end: event.start.dateTime ? moment(event.end.dateTime).format('X') : moment(event.end.date).format('X'),
      recurrence: event.recurrence,
      htmlLink: event.htmlLink,
      status: event.status,
      gEventId: event.id,
      summary: event.summary
    });
  });

  // Store events in the database
  Meteor.call('setEvents', events, function(err, result) {
    Session.set('importedEvents', result);
  });
};

var getEvents = function(params) {
  var url = 'https://www.googleapis.com/calendar/v3/calendars/';

  // Retrieve selected calendars only
  Meteor.call('getCalendars', true, function(err, results) {
    if(err) console.log('err - ', err);
    calendars = results;
    // console.log(calendars);
    var minDate = moment().add('days', -10).format('YYYY-MM-DDTHH:mm:ss') + 'Z';
    var maxDate = moment().add('days', 7).format('YYYY-MM-DDTHH:mm:ss') + 'Z';

    var params = {
      access_token: Meteor.user().services.google.accessToken,
      part: "snippet",
      mine: "true",
      timeMin: minDate,
      timeMax: maxDate,
      singleEvents: true
    };

    Meteor.http.get(url + results[0].gCalId + '/events', {params: params}, handleEventsResponse);
  });
};

/** Google Calendar Init to process downloading GCal data **/
var gCalendarInit = function(func) {
  // Make sure a User is logged in before calling Google API
  if(Meteor.user() && !Meteor.loggingIn()) {
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
*** CALENDAR PAGE VIEW ***
*************************/

Template.calendar_page.selectCalendars = function() {
  return Session.get('selectCalendars');
};

Template.calendar_page.showUserPrefs = function() {
  return Session.get('showCalPrefs');
};

Template.calendar_page.showDayView = function() {
  return Session.get('selectedDay');
};

Template.calendar_page.events({
  'click #showCalPrefs': function() {
    Session.set('showCalPrefs', true);
  }
});

/***********************
*** SELECT CALENDARS ***
***********************/

Template.select_calendars.calendars = function() {
  return Session.get('gCalendars');
};

Template.select_calendars.events({
  'click #importCals': function(e) {
    e.preventDefault();
    var importedCals = [],
        ignoredCals = [];

    // Set all checked calendars to import = true
    _.each($('input:checkbox:checked'), function(cal) {
      Meteor.call('setCalendar', $(cal).val(), true);
    });

    // Set all unchecked calendars to import = false
    _.each($('input:checkbox:not(:checked)'), function(cal) {
      Meteor.call('setCalendar', $(cal).val(), false);
    });

    // Done selecting calendars
    Session.set('selectCalendars', false);
  }
});

/*********************
*** CALENDAR PREFS ***
*********************/

Template.calendar_prefs.daysOfWeek = function() {
  var days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
  var values = ['Su', 'M', 'T', 'W', 'R', 'F', 'Sa'];
  return _.map(days, function(day, i) {
    return {day: days[i], value: values[i]};
  });
};

Template.calendar_prefs.eventTypes = function() {
  var events = ['Breakfast', 'Lunch', 'Happy Hour', 'Dinner', 'Cocktails'];
  var values = ['bfast', 'lun', 'hh', 'din', 'ctails'];
  return _.map(events, function(event, i) {
    return {event: events[i], value: values[i]};
  });
};

Template.calendar_prefs.importedEvents = function() {
  return Session.get('importedEvents');
};

Template.calendar_prefs.hasCalendars = function() {
  return Session.get('hasCalendars');
};

Template.calendar_prefs.events({
  'click .dayBox': function(e) {
    updateUserPreferences(e.target, 'days');
  },

  'click .eventBox': function(e) {
    updateUserPreferences(e.target, 'events');
  },

  'click button.gCal.getCalendars': function() {
    gCalendarInit(getAllCalendars);
  },

  'click button.gCal.getEvents': function() {
    gCalendarInit(getEvents);
  },

  'click #hideCalPrefs': function() {
    Session.set('showCalPrefs', false);
  }
});

Session.set('Date', new Date());
var dayValues = ['Su', 'M', 'T', 'W', 'R', 'F', 'Sa'];

Meteor.autosubscribe(function () {
  if(Meteor.user()) {
    Meteor.subscribe('eventData');
    Meteor.subscribe('calendarData');
  }
});

Deps.autorun(function() {
  if(Meteor.user()) {
    var calendars = Calendars.find({}).fetch() || [];
    var events = Events.find({}).fetch() || [];
    Session.set('dayPrefs', Meteor.user().days || []);
    Session.set('eventPrefs', Meteor.user().events || []);
    if(calendars.length > 0) {
      Session.set('hasCalendars', true);
      Session.set('gCalendars', calendars);
    }
    if(events) {
      Session.set('gEvents', events);
      _.each(events, function(event) {
        // console.log(event);
        var foundEvent = $('#fullCalendar').fullCalendar('clientEvents', event._id);
        if(foundEvent.length > 0) {
          foundEvent.title = event.summary;
          foundEvent.start = event.start;
          foundEvent.end = event.end;
          foundEvent.url = event.htmlLink;
          foundEvent.allDay = event.allDay;
          $('#fullCalendar').fullCalendar('updateEvent', foundEvent);
        } else {
          $('#fullCalendar').fullCalendar('addEventSource', [event]);
        }
      });
    }
  }
});

/**************************
*** FULL CALENDAR FUNCS ***
**************************/

Template.full_calendar.showCalPrefs = function() {
  return Session.get('showCalPrefs');
};

Template.full_calendar.rendered = function() {
  $cal = $('#fullCalendar');
  $cal.empty();
  $cal.fullCalendar({
    // theme: true, // TODO: undue this to allow jQuery UI themes
    aspectRatio: 2,
    header: {
      left: 'prev, next',
      center: 'title',
      right: 'agendaDay, agendaWeek, month'
    },
    weekMode: 'variable',
    eventBackgroundColor: 'salmon',
    agendaDay: {
      minTime: 6,
      maxTime: 8
    },
    eventDataTransform: function(event) {
      var newEvent = {};
      newEvent.id = event._id;
      newEvent.title = event.summary;
      newEvent.start = event.start;
      newEvent.end = event.end;
      // newEvent.url = event.htmlLink;
      newEvent.allDay = event.allDay;
      return newEvent;
    },
    eventRender: function(event, element, view) {
      var node = $('<div class="cal-close"></div>').on('click', function() {
        Meteor.call('deleteEvent', event.id);
        $cal.fullCalendar('removeEventSource', event.source);
      });
      $(element).append(node);
    },
    dayClick: function(date, allDay, jsEvent, view) {
      $cal.fullCalendar('changeView', 'agendaDay');
      console.log(date);
      date = moment(date);
      $cal.fullCalendar('gotoDate', date.year(), date.month(), date.date());
    },
    eventClick: function(event, jsEvent, view) {
      return false;
    }
  });

  // Render the events onto the calendar if they are not in sync
  if(Session.get('gEvents').length !== $cal.fullCalendar('clientEvents').length)
    $cal.fullCalendar('addEventSource', Session.get('gEvents'));

  if(Session.get('dayPrefs')) {
    var daysToIgnore = _.difference(dayValues, Session.get('dayPrefs'));
    _.each(daysToIgnore, function(day) {
      toggleDaysOfWeek(day);
    });
  }
};

Template.full_calendar.events({
  'click #hideCalPrefs': function() {
    Session.set('showCalPrefs', false);
  },

  'click #showCalPrefs': function() {
    Session.set('showCalPrefs', true);
  }
});

/****************************
*** GOOGLE CALENDAR FUNCS ***
****************************/

/** Add the Google account to the user's Meteor account **/
var addGoogleAccount = function() {
  Meteor.loginWithGoogle({
    requestPermissions: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  }, function(err) {
    if(err) {
      if(err.error === 205) {
        Session.set('alert', {class: 'alert-success', type: 'SUCCESS', msg: 'Added Google Calendar'});
        gCalendarInit(getAllCalendars);
      }
      else
        Session.set('alert', {class: 'alert-error', type: 'ERROR', msg: err.reason});
    }
  });
};

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
  Meteor.call('getCalendars', true, function(err, calendars) {
    if(err) console.log('err - ', err);
    _.each(calendars, function(calendar) {
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

      Meteor.http.get(url + calendar.gCalId + '/events', {params: params}, handleEventsResponse);
    });
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

/*********************
*** CALENDAR PREFS ***
*********************/

/** Mark all of those days of the month as unavailable/available **/
var toggleDaysOfWeek = function(day) {
  var days = {
    Su: 1,
    M: 2,
    T: 3,
    W: 4,
    R: 5,
    F: 6,
    Sa: 7
  };

  var $days = $('#fullCalendar table.fc-border-separate tr').find('td:nth-child(' + days[day] + ')');
  _.each($days, function(day, index) {
    // var date = $(day).data('date');
    // var event = {};
    // event.start = event.end = moment(date).format('X');
    // event.summary = 'NO MEETUPS';
    // event._id = index;
    // event.allDay = true;
    // // console.log(event);
    // console.log($(this));
    // $('#fullCalendar').fullCalendar('addEventSource', [event]);
    $(day).toggleClass('busy');
  });
};

// TODO: Change user preferences to save entire array
/** Write the user preferences to the database **/
var updateUserPreferences = function(elm, category) {
  // Get the value of the element
  key = $(elm).val();

  // Determine whether the option is being selected or deselected
  var value;
  if($(elm).hasClass('btn-danger'))
    value = false;
  else
    value = true;

  // Update user preference
  Meteor.call('updateUserCalPreferences', category, key, value);
};

Template.calendar_prefs.daysOfWeek = function() {
  var days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
  return _.map(days, function(day, i) {
    var checked = Session.get('dayPrefs').indexOf(dayValues[i]) === -1 ? false : true;
    return {day: days[i], value: dayValues[i], checked: checked};
  });
};

Template.calendar_prefs.eventTypes = function() {
  var events = ['Breakfast', 'Lunch', 'Happy Hour', 'Dinner', 'Cocktails'];
  var values = ['bfast', 'lun', 'hh', 'din', 'ctails'];
  return _.map(events, function(event, i) {
    var checked = Session.get('eventPrefs').indexOf(values[i]) === -1 ? false : true;
    return {event: events[i], value: values[i], checked: checked};
  });
};

Template.calendar_prefs.importedEvents = function() {
  return Session.get('importedEvents');
};

Template.calendar_prefs.hasCalendars = function() {
  return Session.get('hasCalendars');
};

Template.calendar_prefs.events({
  'submit': function(e) {
    e.preventDefault();
  },

  'click .dayBox': function(e) {
    $(e.target).toggleClass('btn-danger');
    $(e.target).toggleClass('btn-success');
    toggleDaysOfWeek($(e.target).val());
    updateUserPreferences(e.target, 'days');
  },

  'click .eventBox': function(e) {
    $(e.target).toggleClass('btn-danger');
    $(e.target).toggleClass('btn-success');
    updateUserPreferences(e.target, 'events');
  },

  'click .getCalendars': function() {
    if(Meteor.user().services.google)
      gCalendarInit(getAllCalendars);
    else
      addGoogleAccount();
  },

  'click .getEvents': function() {
    gCalendarInit(getEvents);
  }
});

/*************************
*** CALENDAR PAGE VIEW ***
*************************/

Template.calendar_page.selectCalendars = function() {
  return Session.get('selectCalendars');
};

Template.calendar_page.showCalPrefs = function() {
  return Session.get('showCalPrefs');
};

Template.calendar_page.showDayView = function() {
  return Session.get('selectedDay');
};

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

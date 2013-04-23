Session.set('Date', new Date());

Meteor.autosubscribe(function () {
  if(Meteor.user()) {
    Meteor.subscribe('eventData');
    Meteor.subscribe('calendarData');
  }
});

Deps.autorun(function() {
  if(Meteor.user()) {
    var numOfCals = Calendars.find({}).fetch().length;
    var events = Events.find({}).fetch();
    if(numOfCals)
      Session.set('hasCalendars', true);
    if(events)
      Session.set('gEvents', events);
  }
});

var Months = new Array('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December');

/********************
*** MAIN CALENDAR ***
********************/

// TODO: Change user preferences to save entire array
/** Write the user preferences to the database **/
var updateUserPreferences = function(elm, param) {
  // Get the value of the element
  param += param + $(elm).val();

  // Determine whether the box is being checked or unchecked
  var value;
  if($(elm).is(':checked'))
    value = true;
  else
    value = false;

  // Update user preference
  Meteor.call('updateUserCalPreferences', param, value);
};

/** Adjust the calendar month **/
var adjustMonth = function(num){
  var D = new Date(Session.get("Date"));
  if(D.getDate() > 28){ D.setDate(28); }
  D.setMonth(D.getMonth()+num);
  Session.set("Date", D.toDateString());
};

Template.calendar_view.selected_day = function() {
  return Session.get('selectedDay');
};

Template.calendar_view.hours = function() {
  var hours = [{hour: '12am'}];

  // Create an array of hours in the day
  _.each(_.range(1,24), function(num) {
    if(num === 12)
      num = '12pm';
    else if(num < 12)
      num += 'am';
    else
      num = num % 12 + 'pm';
    hours.push({hour: num});
  });

  // Add the events if they exist for that day
  _.each(Session.get('gEvents'), function(event) {
    if(event.start && event.end) {
      var start = moment(event.start);
      var end = moment(event.end);
      var date = moment(Session.get('Date'));
      if(start.date() == Session.get('selectedDay') && start.month() === date.month()) {
        console.log('event for this day!');
        var sHour = start.hour();
        var eHour = end.hour();
        var count = 0;
        while(count < (eHour - sHour)) {
          hours[sHour].start = start.format('h:mma');
          hours[sHour].end = end.format('h:mma');
          hours[sHour].event = event.summary;
          count++;
        }
      }
    }
  });

  return hours;
};

Template.calendar_view.imported_events = function() {
  return Session.get('importedEvents');
};

Template.calendar_view.hasCalendars = function() {
  return Session.get('hasCalendars');
};

Template.calendar_view.date_string = function(){
  var D = new Date(Session.get('Date'));
  return Months[D.getMonth()] + ', ' + D.getFullYear();
};

Template.calendar_view.day_string = function(){
  var D = new Date(Session.get('Date'));
  return 'Tasks for ' + Months[D.getMonth()] + ', ' + D.getDate();
};

Template.calendar_view.get_days = function(){
  var events = _.map(Events.find({start: {$exists: true}, end: {$exists: true}}).fetch(), function(event) {
    event.start = moment(event.start);
    event.end = moment(event.end);
    return event;
  });
  // console.log(events);

  var i;
  var S = moment(Session.get('Date'));
  var D = new Date(S.year(), S.month() + 1, 0);
  // console.log(S, D);

  // Add the headers
  var Days = new Array({number: 'Su'}, {number: 'Mo'}, {number: 'Tu'}, {number: 'We'}, {number: 'Th'}, {number: 'Fr'}, {number: 'Sa'});
// debugger;
  //
  for(i = 0; i<D.getDay()-1; i++) {
    Days.push({number : ' - '});
  }
  for(i = 0; i<D.getDate(); i++)
  {
    var day;
    if(S.date() - 1 === i)
      day = {'number' : i+1, 'class': ' daySelected'};
    else
      day = {'number' : i+1, 'class': ' dayClick'};

    _.each(events, function(event) {
      if(event.start.date() - 1 === i && S.month() === event.start.month()) {
        day['class'] += ' eventDay';
      }
    });

    Days.push(day);
  }

  return Days;
};

Template.calendar_view.daysOfWeek = function() {
  var days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
  var values = ['Su', 'M', 'T', 'W', 'R', 'F', 'Sa'];
  return _.map(days, function(day, i) {
    return {day: days[i], value: values[i]};
  });
};

Template.calendar_view.eventTypes = function() {
  var events = ['Breakfast', 'Lunch', 'Happy Hour', 'Dinner', 'Cocktails'];
  var values = ['bfast', 'lun', 'hh', 'din', 'ctails'];
  return _.map(events, function(event, i) {
    return {event: events[i], value: values[i]};
  });
};

Template.calendar_page.select_calendars = function() {
  return Session.get('select_calendars');
};

Template.calendar_view.events({
  'click #nextMonth': function() {
    adjustMonth(1);
  },

  'click #lastMonth': function() {
    adjustMonth(-1);
  },

  'click .day': function(e) {
    Session.set('selectedDay', $(e.target).text());
  },

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
  }
});

/**********************
*** GOOGLE CALENDAR ***
**********************/

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
  Session.set('select_calendars', true);
  Session.set('gCalendars', calendarArray);
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

Template.select_calendars_view.events({
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
    Session.set('select_calendars', false);
  }
});


Session.set('Date', new Date());

Meteor.autosubscribe(function () {
  if(Meteor.user()) {
    Meteor.subscribe('taskData');
    Meteor.subscribe('eventData');
  }
});

var Months = new Array('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December');


/* Friendster calendar */

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

/** Write the user preferences to the database **/
var updateUserPreferences = function(selector) {
  var values = [];
  _.each($(selector), function(box) {
    if($(box).is(':checked'))
      values.push($(box).val());
  });

  if(selector === '.dayBox') {
    Meteor.call('updateUserCalPreferences', 'days', values);
  } else if(selector === '.eventBox') {
    Meteor.call('updateUserCalPreferences', 'events', values);
  }
  // console.log(values);
};

/** Adjust the calendar month **/
var adjustMonth = function(num){
  var D = new Date(Session.get("Date"));
  if(D.getDate() > 28){ D.setDate(28); }
  D.setMonth(D.getMonth()+num);
  Session.set("Date", D.toDateString());
};

Template.calendar_view.events({
  'click #nextMonth': function() {
    adjustMonth(1);
  },

  'click #lastMonth': function() {
    adjustMonth(-1);
  },

  'click .dayBox': function() {
    updateUserPreferences('.dayBox');
  },

  'click .eventBox': function(e) {
    updateUserPreferences('.eventBox');
  }
});
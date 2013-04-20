Session.set('Date', new Date());

Meteor.autosubscribe(function () {
  if(Meteor.user())
    Meteor.subscribe('taskData');
    Meteor.subscribe('eventData');
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
  console.log(events);

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

Template.calendar_view.events({
  'click #nextMonth': function() {
    adjustMonth(1);
  },
  'click #lastMonth': function() {
    adjustMonth(-1);
  },
  'click .dayBox': function(e) {
    console.log(e.target);
  },
  'click .eventBox': function(e) {
    console.log(e.target);
  }
});
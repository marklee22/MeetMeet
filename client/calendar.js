Session.set('Date', new Date());

Meteor.autosubscribe(function () {
  if(Meteor.user())
    Meteor.subscribe('taskData');
    Meteor.subscribe('eventData');
});

var Months = new Array('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December');

Template.Tasks.DayString = function(){
  var D = new Date(Session.get('Date'));
  return 'Tasks for ' + Months[D.getMonth()] + ', ' + D.getDate();
};

Template.Tasks.Editing = function(){
  return Session.equals('Editing', this._id);
};

Template.Tasks.TasksForDate = function(){
  return Tasks.find({'date': Session.get('Date')});
};

Template.Tasks.DateString = function(){
  var D = new Date(Session.get('Date'));
  return Months[D.getMonth()] + ', ' + D.getFullYear();
};

Template.Tasks.GetDays = function(){
  var i;
  var S = new Date(Session.get('Date'));
  var D = new Date(S.getYear(), S.getMonth()+1, 0);
  var Days = new Array({Number: 'Su'}, {Number: 'Mo'}, {Number: 'Tu'}, {Number: 'We'}, {Number: 'Th'}, {Number: 'Fr'}, {Number: 'Sa'});
  for(i = 0; i<D.getDay(); i++) {
    Days.push({Number : ' - '});
  }
  for(i = 0; i<D.getDate(); i++)
  {
    if(S.getDate() == i+1){ Days.push({'Number' : i+1, 'Class': ' DaySelected'}); }
    else{ Days.push({'Number' : i+1, 'Class': ' DayClick'}); }
  }
  return Days;
};

function Check(id, Done){
  Tasks.update({'_id': id}, { $set : {'Done' : !Done}});
}

function NewTask(){
  Tasks.insert({ 'userId' : Meteor.userId(), 'date' : Session.get('Date'), 'done' : false, 'name' : 'New Task (Click To Edit)' });
}

function adjustMonth(Num){
  var D = new Date(Session.get('Date'));
  if(D.getDate() > 28){ D.setDate(28); }
  D.setMonth(D.getMonth()+Num);
  Session.set('Date', D.toDateString());
}

Template.Tasks.events = {
  'click #TodosButton': NewTask,
  'click #TodosBottom': NewTask,
  'click .RowText':function(){ Session.set('Editing', this._id); },
  'click .Close':function(){ Tasks.remove({'_id': this._id}); },
  'click #NextMonth': function(){ adjustMonth(1);  },
  'click #LastMonth': function(){ adjustMonth(-1); },
  'focus #TodosEdit':function(){ document.getElementById('TodosEdit').select(); },
  'blur #TodosEdit':function(){
    var tname = document.getElementById('TodosEdit').value;
    if(tname == '')
      tname = 'New Task (Click To Edit)';
    Tasks.update({'_id': Session.get('Editing')}, {$set : {'name': tname}});
    Session.set('Editing');
  },
  'click .DayClick':function(){
    var D = new Date(Session.get('Date'));
    D.setDate(this.Number);
    Session.set('Date', D.toDateString());
  }
};


/* Friendster calendar */

Deps.autorun(function() {
  if(Session.get('events'))
    alert('New Events');
});

Template.calendar_view.date_string = function(){
  var D = new Date(Session.get('Date'));
  return Months[D.getMonth()] + ', ' + D.getFullYear();
};

Template.calendar_view.day_string = function(){
  var D = new Date(Session.get('Date'));
  return 'Tasks for ' + Months[D.getMonth()] + ', ' + D.getDate();
};

Template.calendar_view.get_days = function(){
  var i;
  var S = new Date(Session.get('Date'));
  var D = new Date(S.getYear(), S.getMonth()+1, 0);
  var Days = new Array({number: 'Su'}, {number: 'Mo'}, {number: 'Tu'}, {number: 'We'}, {number: 'Th'}, {number: 'Fr'}, {number: 'Sa'});
  for(i = 0; i<D.getDay(); i++) {
    Days.push({number : ' - '});
  }
  for(i = 0; i<D.getDate(); i++)
  {
    if(S.getDate() == i+1){ Days.push({'number' : i+1, 'class': ' daySelected'}); }
    else{ Days.push({'number' : i+1, 'class': ' dayClick'}); }
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
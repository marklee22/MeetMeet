Meteor.startup(function () {
  Meteor.publish('userData', function() {
    return Meteor.users.find({_id: this.userId}, {fields: {'services': 1, 'resumes': 1}});
  });

  Meteor.methods = {
    updateCalendars: function(userId, calendars) {

    }
  }
});
Meteor.startup(function () {
  Meteor.publish('userData', function() {
    // return Meteor.users.find({_id: this.userId}, {fields: {'services': 1, 'resumes': 1}});
    return Meteor.users.find({});
  });

  Meteor.publish('calendarData', function() {
    return Calendars.find({});
  });

  Meteor.publish('taskData', function() {
    return Tasks.find({});
  });

  Meteor.publish('eventData', function() {
    return Events.find({});
  })

  Meteor.methods({
    clearCalendars: function() {
      Calendars.remove({});
    },

    /** Writes the Google calendar ids to the collection if they don't exist.
        Returns the number of records inserted **/
    setCalendars: function(userId, calendars) {
      var count = 0;

      // Loop through each calendar
      _.each(calendars, function(calendar) {
        // Insert the calendar if not found
        if(!Calendars.findOne({gCalId: calendar.gCalId})) {
          count++;
          calendar['userId'] = userId;
          Calendars.insert(calendar);
        }
      });
      return count;
    },

    /** Returns all the calendar Ids of a User **/
    getCalendars: function(isSelected) {
      return Calendars.find({isSelected: isSelected}).fetch();
    },

    /** Write new events to the collection and return the number written **/
    setEvents: function(userId, events) {
      var count = 0;

      // Loop through each event
      _.each(events, function(event) {
        if(!Events.findOne({gEventId: event.gEventId})) {
          count++;
          event['userId'] = userId;
          Events.insert(event);
        }
      });

      return count;
    },

    setFriends: function(userId, friends) {
      Meteor.users.update({_id: userId}, {$set: {friends: friends}});
    },

    toggleFriend: function(userId, friendId, status) {
      Meteor.users.update({_id: userId,'friends.id': friendId}, {$set: {'friends.$.isSelected': status}});
    },

    updateUserCalPreferences: function(param, values) {
      console.log(param, values);
      if(param === 'days')
        Meteor.users.update({_id: this.userId}, {$set: {days: values}});
      else if(param === 'events')
        Meteor.users.update({_id: this.userId}, {$set: {events: values}});
    }
  });
});
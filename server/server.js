Meteor.startup(function () {
  Meteor.publish('userData', function() {
    // return Meteor.users.find({_id: this.userId}, {fields: {'services': 1, 'resumes': 1}});
    return Meteor.users.find({_id: this.userId});
  });

  Meteor.publish('calendarData', function() {
    return Calendars.find({userId: this.userId});
  });

  Meteor.publish('eventData', function() {
    return Events.find({userId: this.userId});
  });

  Meteor.publish('friendData', function() {
    return Friends.find({userId: this.userId});
  });

  Meteor.methods({
    clearCalendars: function() {
      Calendars.remove({});
    },

    /** Change the status of a calendar's import status **/
    setCalendar: function(calendarId, isSelected) {
      console.log('Updating calendar: ' + calendarId + ' to value: ' + isSelected);
      var calObj = Calendars.findOne({gCalId: calendarId, userId: this.userId}, {_id:1});
      Calendars.update({_id: calObj._id}, {$set: {isSelected: isSelected}});
    },

    /** Writes the Google calendar ids to the collection if they don't exist.
        Returns the number of records inserted **/
    importCalendars: function(userId, calendars) {
      var count = 0;

      // Loop through each calendar
      _.each(calendars, function(calendar) {
        // Insert the calendar if not found
        if(!Calendars.findOne({gCalId: calendar.gCalId})) {
          count++;
          calendar['userId'] = userId;
          calendar['isSelected'] = false;
          Calendars.insert(calendar);
        }
      });
      return count;
    },

    /** Returns all the calendar Ids of a User **/
    getCalendars: function(isSelected) {
      return Calendars.find({isSelected: isSelected, userId: this.userId}).fetch();
    },

    /** Write new events to the collection and return the number written **/
    setEvents: function(events) {
      var count = 0;
      var userId = this.userId;

      // Loop through each event
      _.each(events, function(event) {
        count++;
        event['userId'] = userId;
        var eventObj = Events.findOne({gEventId: event.gEventId});
        if(eventObj) {
          console.log('Updating event: ' + eventObj.gEventId);
          Events.update({_id: event.id}, event);
        } else {
          console.log('Inserting new event: ' + event.gEventId);
          Events.insert(event);
        }
      });

      return count;
    },

    deleteEvent: function(eventId) {
      console.log('Deleting event: ' + eventId);
      Events.remove({_id: eventId});
    },

    insertFriends: function(friends) {
      console.log('Inserting new friend list for user: ' + this.userId);
      var obj = {
        userId: this.userId,
        fbookId: Meteor.user().services.facebook.id,
        fbookName: Meteor.user().services.facebook.name,
        friendsList: friends
      };
      Friends.insert(obj);
    },

    // setFriends: function(userId, friends) {
    //   Meteor.users.update({_id: userId}, {$set: {friends: friends}});
    // },

    toggleFriend: function(friendId, status) {
      console.log('Changing user: ' + this.userId + ' friend: ' + friendId + ' to: ' + status);
      Friends.update({userId: this.userId, 'friendsList.id': friendId}, {$set: {'friendsList.$.isSelected': status}});
    },

    // TODO: Change user preferences to save entire array
    updateUserCalPreferences: function(param, value) {
      console.log('Updating user with: ' + param + ': ' + value);
      Meteor.users.update({_id: this.userId}, {$set: {param: value}});
    }
  });
});
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
      console.log('Importing calendars for userId: ' + userId);
      var count = 0;

      // Loop through each calendar
      _.each(calendars, function(calendar) {
        // Insert the calendar if not found
        if(Calendars.find({gCalId: calendar.gCalId, userId: userId}).count() === 0) {
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

    /**
      - Save friend setting
      - Lookup Fbook friendlist based on facebook Id
      - Find friend's friendlist
      - Filter friend list to get the isSelected property off the user
      - If isSelected on both, then add account to both users
      friendsList: {
        mutualFriends: {
          123
          456
        }
      }
      {
  "loc" : [
    37.7837147,
    -122.40909559999999
  ],
  "userId" : "asdf"
}
      - If !isSelected on one, then remove account from both users
    **/
    toggleFriend: function(friendId, status) {
      Friends.update({userId: this.userId, 'friendsList.id': friendId}, {$set: {'friendsList.$.isSelected': status}});
      console.log('Changing user: ' + this.userId + ' friend: ' + friendId + ' to: ' + status);
      console.log('****');

      // Get friend's friendlist
      var fbookObj = Friends.findOne({'fbookId': friendId});

      // Determine whether both friends selected each other
      if(fbookObj) {
        console.log('# of friends: ' + fbookObj.friendsList.length);

        // Filter current user's object out of friend's friendlist
        var userFromFriendList = _.filter(fbookObj.friendsList, function(friend) {
          return friend.id === Meteor.user().services.facebook.id;
        })[0];
        console.log('user in friend list: ', userFromFriendList);
        console.log(status, userFromFriendList.isSelected);
        if(status && userFromFriendList.isSelected) {
          console.log('MUTUAL FRIENDS!');
          Friends.update({userId: fbookObj.userId}, {$addToSet: {mutualFriends: this.userId}});
          Friends.update({userId: this.userId}, {$addToSet: {mutualFriends: fbookObj.userId}});
        } else {
          console.log('NOT FRIENDS!');
          if(fbookObj.mutualFriends) {
            var index = fbookObj.mutualFriends.indexOf(this.userId);
            if(index !== -1) {
              fbookObj.mutualFriends.splice(index, 1);
            }
          }
        }
        console.log('****');
      }
    },

    // TODO: Change user preferences to save entire array
    updateUserCalPreferences: function(param, value) {
      console.log('Updating user with: ' + param + ': ' + value);
      Meteor.users.update({_id: this.userId}, {$set: {param: value}});
    },

    setLocation: function(lng, lat) {
      console.log('Setting user: ' + this.userId + ' (longitude, latitude): (' + lng + ',' + lat +')');
      Locations.update({userId: this.userId}, {
        $set: {
          loc: [lng, lat]
        }
      }, {upsert: true});
    },

    getNearbyUsers: function(distance) {
      console.log('Getting nearby users for userId: ' + this.userId);
      var userLoc = Locations.findOne({userId: this.userId});
      if(userLoc.loc) {
        // db.locations.find( { loc: { $within: { $center: [[-122,37],10/3959] } } });
        // console.log(userLoc);

        var locations = Locations.find({
          loc: {
            $within: {
              $center: [
                [userLoc.loc[0], userLoc.loc[1]],
                distance / 69
              ]
            }
          }
        });
        locations = locations.fetch();
        // console.log('loc - ', locations);
        return locations;
      } else
        return [];
    }
  });
});
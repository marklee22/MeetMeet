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

  // Return all meetings a user is involved with
  Meteor.publish('meetingData', function() {
    return Meetings.find({'users.id': this.userId});
  });

  /*********************
  *** SERVER METHODS ***
  *********************/

  var eventTimeFilters = {
    'bfast': [7,7.5,8,8.5,9],
    'lun': [11.5,12,12.5,13,13.5],
    'hh': [17,17.5,18,18.5,19,19.5],
    'din': [18,18.5,19,19.5,20,20.5,21],
    'ctails': [20,20.5,21,21.5,22,22.5]
  };

  /**
    - Get user schedule
    - Find all times for current day that are free
      - Calculate time range of tomorrow - today
      - Return if either user has an all day event
      - Create a hash of the 24 hours
      - Delete elements where times are busy
    - Find intersection between the two arrays
  **/
  var getFreeTimes = function(start, end, userId) {
    var dayHourHash = _.range(0, 24, 0.5);
    // console.log('**********');
    var userSchedule = Events.find({
      userId: userId,
      start: {$gte: start},
      end: {$lte: end}
    });

    // Return all times as available if no events found for that day
    if(userSchedule)
      userSchedule = userSchedule.fetch();
    else
      return dayHourHash;

    // Return empty array if no event preferences set
    var eventPrefs = Meteor.users.findOne({_id: userId}).events;
    if(!eventPrefs)
      return [];

    // Calculate all the event hours to filter for
    var eventHoursFilter = [];
    _.each(eventPrefs, function(pref) {
      eventHoursFilter = eventHoursFilter.concat(eventTimeFilters[pref]);
    });

    // console.log('filter: ', eventHoursFilter);
    dayHourHash = _.intersection(dayHourHash, eventHoursFilter);
    // console.log('event filtered hours: ' + dayHourHash);

    // console.log('filtered schedule: ', userSchedule);
    var busyTimes = [];
    _.each(userSchedule, function(event) {
      var startHour = (event.start - start) / 3600;
      var endHour = (event.end - start) / 3600;
      busyTimes = busyTimes.concat(_.range(startHour, endHour, 0.5));
    });

    // console.log('busyTimes: ', busyTimes);
    dayHourHash = _.difference(dayHourHash, busyTimes);
    // console.log('userFreeTime: ', dayHourHash);

    // console.log('**********');
    return dayHourHash;
  };

  /** Write a meeting to the database **/
  var createMeeting = function(userId, friendId, start, end) {
    var user = Meteor.users.findOne({_id:userId});
    var friend = Meteor.users.findOne({_id:friendId});
    var meeting = {
      users: [
        {
          id: userId,
          name: user.profile.name,
          fbookId: user.services.facebook.id
        },
        {
          id: friendId,
          name: friend.profile.name,
          fbookId: friend.services.facebook.id
        }
      ],
      start: start,
      end: end
    };

    Meetings.insert(meeting);
  };

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
    updateUserCalPreferences: function(category, key, value) {
      console.log('Updating user: ' + this.userId + ' cal pref ' + category +'. Setting ' + key + ': ' + value);
      // Get current user's settings
      if(category === 'days') {
        var days = Meteor.users.findOne({_id: this.userId}, {days:1}).days || [];
        // Add key if value is true
        if(value) {
          days.push(key);
          days = _.uniq(days);
        } else // Remove key if value is false
          days = _.without(days, key);

        console.log(days);
        Meteor.users.update({_id: this.userId}, {$set: {days: days}});
      } else if(category === 'events') {
        var events = Meteor.users.findOne({_id: this.userId}, {events:1}).events || [];
        // Add key if value is true
        if(value) {
          events.push(key);
          events = _.uniq(events);
        } else // Remove key if value is false
          events = _.without(events, key);

        console.log(events);
        Meteor.users.update({_id: this.userId}, {$set: {events: events}});
      }
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
    },

    getMutualTimes: function(userId, friendId) {
      console.log('Searching for mutual times between friends');
      // console.log(userTimeHash);

      // Calculate the beginning of today and tomorrow for a date range
      var today = moment().startOf('day').format('X');
      var tomorrow = moment().add('day',1).startOf('day').format('X');
      // console.log('start, end: ', today, tomorrow);

      // Get each user's free times and find the intersection
      var userFreeHours = getFreeTimes(today, tomorrow, userId);
      var friendFreeHours = getFreeTimes(today, tomorrow, friendId);
      // console.log('user free hours: ',userFreeHours.join(','));
      // console.log('friend free hours: ',friendFreeHours.join(','));
      var mutualTime = _.intersection(userFreeHours, friendFreeHours);
      // console.log('MUTUAL FREE TIME: ', mutualTime.join(','));
      return mutualTime;
    },

    testMeeting: function() {
      var userId = 'Jxdmr2T4thi2GpJZw';
      var friendId = 'tAMYpwWKYbHjXbiEa';
      console.log('Creating meeting');
      createMeeting(userId, friendId, moment().format('X'), moment().add('hours',1).format('X'));
    },

    lookupUser: function(friendId) {
      return 'test';
    }
  });
});
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
    return Meetings.find({'users.id': this.userId},{sort: {start:-1}, limit: 10});
  });

  /**********************
  *** TRUSTED METHODS ***
  **********************/

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

    /**
      - Save friend setting
      - Lookup Fbook friendlist based on facebook Id
      - Find friend's friendlist
      - Filter friend list to get the isSelected property off the user
      - If isSelected on both, then add account to both users
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
          loc: [lng, lat],
          updatedAt: moment().unix()
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

    getLocation: function() {
      console.log('Getting location of user: ' + this.userId);
      return Locations.findOne({userId: this.userId}, {fields: {loc:1}});
    },

    yelpQuery: function(search, isCategory, longitude, latitude) {
      console.log('Yelp search for userId: ' + this.userId + '(search, isCategory, lng, lat) with vals (', search, isCategory, longitude, latitude, ')');

      // Query OAUTH credentials (these are set manually)
      var auth = Accounts.loginServiceConfiguration.findOne({service: 'yelp'});

      // Add auth signature manually
      auth['serviceProvider'] = { signatureMethod: "HMAC-SHA1" };

      var accessor = {
        consumerSecret: auth.consumerSecret,
        tokenSecret: auth.accessTokenSecret
      },
      parameters = {};

      // Search term or categories query
      if(isCategory)
        parameters.category_filter = search;
      else
        parameters.term = search;

      // Set lat, lon location, if available (SF is default location)
      if(longitude && latitude)
        parameters.ll = latitude + ',' + longitude;
      else
        parameters.location = 'San+Francisco';

      // Results limited to 5
      parameters.limit = 5;

      // Configure OAUTH parameters for REST call
      parameters.oauth_consumer_key = auth.consumerKey;
      parameters.oauth_consumer_secret = auth.consumerSecret;
      parameters.oauth_token = auth.accessToken;
      parameters.oauth_signature_method = auth.serviceProvider.signatureMethod;

      // Create OAUTH1 headers to make request to Yelp API
      var oauthBinding = new OAuth1Binding(auth.consumerKey, auth.consumerSecret, 'http://api.yelp.com/v2/search');
      oauthBinding.accessTokenSecret = auth.accessTokenSecret;
      var headers = oauthBinding._buildHeader();

      // Return data results only
      return oauthBinding._call('GET', 'http://api.yelp.com/v2/search', headers, parameters).data;
    },

    userSettingsComplete: function() {
      Meteor.users.update({_id: this.userId}, {$set: {isNewUser: false}});
    },

    updateMeeting: function(id, status) {
      console.log('Updating meeting id: ' + id + ' with (user, status): ' + this.userId + ', ' + status);
      Meetings.update({_id: id, 'users.id': this.userId},{$set: {'users.$.status':1}});
    }
  });
});
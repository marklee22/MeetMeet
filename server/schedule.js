/*************************
*** SERVER-SIDE ONLY   ***
*** MEETING SCHEDULING ***
*************************/

// Filters cover every hour and half hour time period in a 24 hour clock
var eventTimeFilters = {
  'bfast': [7,7.5,8,8.5,9],
  'lun': [11.5,12,12.5,13,13.5],
  'hh': [17,17.5,18,18.5,19,19.5],
  'din': [18,18.5,19,19.5,20,20.5,21],
  'ctails': [20,20.5,21,21.5,22,22.5]
};

// Day hash
var days = {
  '0': 'Su',
  '1': 'M',
  '2': 'T',
  '3': 'W',
  '4': 'R',
  '5': 'F',
  '6': 'Sa'
};

/** 'Cronjob' that schedules meetings automatically between two mutual friends **/
var _scheduleMeetings = function() {
  console.log('Running scheduleMeetings cronjob');

  // Initialize beginning of tomorrow and end of tomorrow in UNIX time
  var today = moment().add('day', 1).startOf('day').unix();
  var tomorrow = moment().add('day', 1).endOf('day').unix();

  // Invalidate expired meetings
  _clearExpiredMeetings();

  // Find all users without meetings
  var freeUsers = _getUsersWithoutMeetings();

  // Filter out invalid users
  var invalidUsers = Meteor.users.find({days: {$in: [days[moment().format('d')]]}}, {fields: {_id:1}}).fetch() || [];
  var userIds = _.difference(freeUsers, invalidUsers);

  // Find a meeting for each user without a meeting
  _.each(userIds, function(user) {
    // Get all mutual friends for a user
    var friends = Friends.findOne({userId: user._id}, {fields: {mutualFriends:1}});
    if(friends && friends.mutualFriends) {
      // Pick a random friend (TODO: make randomization smarter)
      var rand = Math.floor(Math.random() * friends.mutualFriends.length);

      // Find mutual times between user and random friend
      var times = _getMutualTimes(user._id, friends.mutualFriends[rand]);

      // Mutual time found. Create meeting for both users based on mutual free time
      if(times.length > 0) {
        var time = Math.floor(Math.random() * times.length);
        var start = today + 3600 * times[time];
        var end = today + 3600 * times[time] + 1800;

        _createMeeting(user._id, friends.mutualFriends[rand], start, end);
      }
    }
  });
};

/** Sets all expired meetings to expired **/
var _clearExpiredMeetings = function() {
  console.log('Clearing all expired meetings');
  var meetings = Meetings.find({isExpired: false}, {fields: {_id:1, start:1, end:1}}).fetch() || [];

  // Expire any meetings that are older than the current time
  _.each(meetings, function(meeting) {
    if(meeting.end < moment().unix()) {
      console.log('Meeting expired: ' + meeting._id);
      Meetings.update({_id: meeting._id}, {$set: {isExpired: true}});
    }
  });
};

/** Returns all users without meetings scheduled **/
var _getUsersWithoutMeetings = function() {
  console.log('Getting all users without meetings');
  // Get all users with meetings
  var meetings = _.flatten(_.pluck(Meetings.find({isExpired: false}, {fields: {'users.id':1}}).fetch(), 'users'));
  var busyUsers = [];
  _.each(meetings, function(meeting) {
    if(busyUsers.indexOf(meeting.id) === -1)
      busyUsers.push(meeting.id);
  });

  // Query all users not busy
  return Meteor.users.find({_id: {$nin: busyUsers}}, {fields: {_id:1}}).fetch();
};

/** Get the mutual times between two users **/
var _getMutualTimes = function(userId, friendId) {
  console.log('Searching for mutual times between friends: ' + userId + ', ' + friendId);

  // Calculate the beginning of today and tomorrow for a date range
  var today = moment().add('day', 1).startOf('day').unix();
  var tomorrow = moment().add('day',1).endOf('day').unix();

  // Get each user's free times and find the intersection
  var userFreeHours = _getFreeTimes(today, tomorrow, userId);
  var friendFreeHours = _getFreeTimes(today, tomorrow, friendId);
  var mutualTimes = _.intersection(userFreeHours, friendFreeHours);

  return mutualTimes;
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
var _getFreeTimes = function(start, end, userId) {
  console.log('Get free times for user: ', userId);
  var dayHourHash = _.range(0, 24, 0.5);

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

  // Calculate hour hash of all available times for user
  var eventHoursFilter = [];
  _.each(eventPrefs, function(pref) {
    eventHoursFilter = eventHoursFilter.concat(eventTimeFilters[pref]);
  });

  // Calculate actual free + selected hours for that day
  dayHourHash = _.intersection(dayHourHash, eventHoursFilter);

  var busyTimes = [];
  _.each(userSchedule, function(event) {
    var startHour = (event.start - start) / 3600;
    var endHour = (event.end - start) / 3600;
    busyTimes = busyTimes.concat(_.range(startHour, endHour, 0.5));
  });

  dayHourHash = _.difference(dayHourHash, busyTimes);

  return dayHourHash;
};

/** Write a meeting to the database **/
var _createMeeting = function(userId, friendId, start, end) {
  console.log('Creating meeting between users: ' + userId + ', ' + friendId);
  var user = Meteor.users.findOne({_id:userId});
  var friend = Meteor.users.findOne({_id:friendId});
  var meeting = {
    users: [
      {
        id: userId,
        name: user.profile.name,
        fbookId: user.services.facebook.id,
        status: 0
      },
      {
        id: friendId,
        name: friend.profile.name,
        fbookId: friend.services.facebook.id,
        status: 0
      }
    ],
    start: start,
    end: end,
    isExpired: false
  };

  Meetings.insert(meeting);
};

// Run cronjob every 5 minutes
Meteor.setInterval(_scheduleMeetings, 10000);
Meteor.subscribe('userData');
Meteor.subscribe('calendarData');
Meteor.subscribe('meetingData');

Deps.autorun(function() {
  if(Meteor.user()) {
    var meetings = Meetings.find({});
    if(meetings.count() > 0) {
      meetings = meetings.fetch();
      var newMeeting = _.filter(meetings, function(mtg) { return !mtg.isExpired; }) || '';
      var meetingHistory = _.filter(meetings, function(mtg) { return mtg.isExpired; }) || '';
      Session.set('meetingRequest', newMeeting[0]);
      Session.set('meetings', meetingHistory);

      // Determine users' meeting choices
      var currUser = _.filter(newMeeting[0].users, function(user) { return user.id === Meteor.user()._id; })[0];
      var friend = _.filter(newMeeting[0].users, function(user) { return user.id !== Meteor.user()._id; })[0];

      if(currUser.status === 1 && friend.status === 1)
        Session.set('meetingActionTaken', 'Both Accepted!');
      else {
        if(currUser.status === 1)
          Session.set('meetingActionTaken', 'Accepted');
        else if(currUser.status === 2)
          Session.set('meetingActionTaken', 'Declined');

        if(friend.status !== 0) {
          // Notify user that friend is waiting for a reply
          if(currUser.status > 0)
            Session.set('meetingAlert', '');
          else
            Session.set('meetingAlert', 'Friend is Waiting!');
        }
      }

      // Get location and run query to find near yelp places
      Meteor.call('getLocation', function(err, location) {
        // TODO: run query with variable search params based on time
        Meteor.call('yelpQuery', 'bars', true, location.loc[0], location.loc[1], function(err, results) {
          Session.set('yelpPlaces', results.businesses);
        });
      });
    }
  }
});

/***********
*** GMAP ***
***********/
var map;

var mapInitialize = function() {
  var mapOptions = {
    zoom: 14,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  map = new google.maps.Map(document.getElementById('map-canvas'),
      mapOptions);

  // Try HTML5 geolocation
  if(navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var pos = new google.maps.LatLng(position.coords.latitude,
                                       position.coords.longitude);

      Meteor.call('setLocation', position.coords.longitude, position.coords.latitude);

      var marker = new google.maps.Marker({
        map: map,
        position: pos,
        animation: google.maps.Animation.DROP,
        title: 'You are here'
      });

      map.setCenter(pos);

      // Click handler to add new points on the map
      google.maps.event.addListener(map, 'click', function(event) {
        placeMarker(event.latLng);
      });

      Meteor.call('getNearbyUsers', 25, function(err, results) {
      _.each(results, function(item) {
        var position = new google.maps.LatLng(item.loc[1], item.loc[0]);
        setTimeout(placeMarker(position), 500);
      });

      if(Session.get('yelpPlaces')) {
        _.each(Session.get('yelpPlaces'), function(place) {
          var location = new google.maps.LatLng(place.location.coordinate.latitude, place.location.coordinate.longitude);
          placeMarker(location, 'bar');
        });
      }
    });

    }, function() {
      handleNoGeolocation(true);
    });
  } else {
    // Browser doesn't support Geolocation
    handleNoGeolocation(false);
  }
};

var placeMarker = function(location, type) {
  // Meteor.call('setLocation', location.lng(), location.lat());
  var marker = new google.maps.Marker({
    position: location,
    animation: google.maps.Animation.DROP,
    map: map
  });

  var icon;
  switch(type) {
    case 'bar':
      icon = 'http://maps.google.com/mapfiles/ms/micons/bar.png';
      break;
    default:
      icon = 'http://maps.google.com/mapfiles/marker.png';
  }
  marker.setIcon(icon);
};

function handleNoGeolocation(errorFlag) {
  if (errorFlag) {
    var content = 'Error: The Geolocation service failed.';
  } else {
    var content = 'Error: Your browser doesn\'t support geolocation.';
  }

  var options = {
    map: map,
    position: new google.maps.LatLng(60, 105),
    content: content
  };

  var infowindow = new google.maps.InfoWindow(options);
  map.setCenter(options.position);
}

/****************
*** MAIN PAGE ***
****************/

Template.main_page.rendered = function() {
  google.maps.event.addDomListener(window, 'load', mapInitialize);
  google.maps.event.trigger(window, 'load');
};

Template.main_page.places = function() {
  return Session.get('yelpPlaces');
};

Template.place.all_cats = function(categories) {
  categories = _.flatten(categories);
  categories = _.filter(categories, function(cat) {
    return cat.indexOf('_') === -1;
  });
  return _.uniq(categories, false, function(cat) {
    return cat.toUpperCase();
  }).join(', ');
};

Template.main_page.meetingActionTaken = function() {
  return Session.get('meetingActionTaken');
};

Template.main_page.meetingAlert = function() {
  return Session.get('meetingAlert');
};

Template.main_page.meetingClass = function(meeting) {
  if(/[Aa]ccepted/.test(meeting))
    return 'text-success';
  else
    return 'text-error';
};

Template.main_page.events({
  'click #acceptMeeting': function() {
    Session.set('meetingActionTaken', 'Accepted');

    // Update status in meetingRequest of specified user
    var meeting = Session.get('meetingRequest');
    Meteor.call('updateMeeting', meeting._id, 1);
  },

  'click #declineMeeting': function() {
    Session.set('meetingActionTaken', 'Declined');

    // Update status in meetingRequest of specified user
    var meeting = Session.get('meetingRequest');
    Meteor.call('updateMeeting', meeting._id, 2);
  }
});

/********************
*** MEETINGS PAGE ***
********************/

Template.main_page.new_meeting = function() {
  if(Session.get('meetingRequest'))
    return Session.get('meetingRequest');
  else
    return;
};

Template.meetings.meetings = function() {
  return Session.get('meetings');
};

/**************
*** MEETING ***
**************/

Template.meeting.getMonth = function(start) {
  return moment.unix(start).format('MMMM');
};

Template.meeting.getDay = function(start) {
  return moment.unix(start).format('D');
};

Template.meeting.formatTime = function(start, end) {
  return moment.unix(start).format('h:mm A') + ' - ' + moment.unix(end).format('h:mm A');
};

Template.meeting.lookupUserName = function(users) {
  var friend = _.filter(users, function(user) {
    return user.id !== Meteor.userId();
  });
  return friend[0].name;
};

Template.meeting.lookupUserId = function(users) {
  var friend = _.filter(users, function(user) {
    return user.id !== Meteor.userId();
  });
  return friend[0].fbookId;
};

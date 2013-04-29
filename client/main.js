Meteor.subscribe('userData');
Meteor.subscribe('calendarData');
Meteor.subscribe('meetingData');

Deps.autorun(function() {
  if(Meteor.user()) {
    var meetings = Meetings.find({});
    if(meetings.count() > 0) {
      meetings = meetings.fetch();
      _.sortBy(meetings, function(mtg) { return -mtg.start; });
      Session.set('meetingRequest', meetings.shift());
      Session.set('meetings', meetings);
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
    });

    }, function() {
      handleNoGeolocation(true);
    });
  } else {
    // Browser doesn't support Geolocation
    handleNoGeolocation(false);
  }
};

var placeMarker = function(location) {
  Meteor.call('setLocation', location.lng(), location.lat());
  var marker = new google.maps.Marker({
    position: location,
    animation: google.maps.Animation.DROP,
    map: map
  });
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

Template.main_page.events({
  'click #getMutualTime': function() {
    console.log('getting mutual times');
    Meteor.call('getMutualTimes', 'Jxdmr2T4thi2GpJZw', 'tAMYpwWKYbHjXbiEa', function(err, results) {
      console.log(results);
    });
  },

  'click #testButton': function() {
    Meteor.call('testMeeting');
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

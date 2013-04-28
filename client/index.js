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

/*************
*** ROUTER ***
*************/

Meteor.Router.add({
  '/': 'main_page',
  '/calendar': 'calendar_page',
  '/friends': 'friends_page',
  '/about': 'about_page',
  '/FAQ': 'faq_page',
  '/signup': 'signup_page',
  '/forgot_password': 'forgot_password_page',
  '/contact': 'contact_page'
});

Meteor.Router.filters({
  'checkLoggedIn': function(page) {
    if(Meteor.loggingIn()) {
      return 'loading_page';
    } else if(Meteor.user()) {
      return page;
    } else {
      return 'signin_page';
    }
  }
});

Meteor.Router.filter('checkLoggedIn', {only: ['main_page', 'friends_page', 'calendar_page']});

/*******************
*** CURRENT PAGE ***
*******************/

Template.page.currentPage = function() {
  return 'The current page is: ' + Meteor.Router.page();
};

/***********
*** GMAP ***
***********/
var map;

var mapInitialize = function() {
  var mapOptions = {
    zoom: 15,
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
  'click #showUsers': function() {
    console.log('showUsers clicked');
  },

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

Template.meetings.new_meeting = function() {
  if(Session.get('meetingRequest'))
    return Session.get('meetingRequest');
  else
    return;
};

Template.meetings.meetings = function() {
  return Session.get('meetings');
};

Template.meeting.format_time = function(start, end) {
  start = moment.unix(start);
  end = moment.unix(end);

  return start.format('MMM D - ') + start.format('h:mm A') + ' - ' + end.format('h:mm A');
};

Template.meeting.lookup_user_name = function(users) {
  var friend = _.filter(users, function(user) {
    return user.id !== Meteor.userId();
  });
  return friend[0].name;
};

Template.meeting.lookup_user_id = function(users) {
  var friend = _.filter(users, function(user) {
    return user.id !== Meteor.userId();
  });
  return friend[0].fbookId;
};

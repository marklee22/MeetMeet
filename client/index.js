Meteor.subscribe('userData');
Meteor.subscribe('calendarData');

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

Meteor.Router.filter('checkLoggedIn', {only: ['main_page', 'friends_page', 'map_page', 'calendar_page']});

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

      var marker = new google.maps.Marker({
        map: map,
        position: pos,
        animation: google.maps.Animation.DROP,
        title: 'You are here'
      });

      map.setCenter(pos);
    }, function() {
      handleNoGeolocation(true);
    });
  } else {
    // Browser doesn't support Geolocation
    handleNoGeolocation(false);
  }
}

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


Template.main_page.rendered = function() {
  console.log('rendered maps');
  google.maps.event.addDomListener(window, 'load', mapInitialize);
  google.maps.event.trigger(window, 'load');
};
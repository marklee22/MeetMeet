/*************************
*** Facebook Functions ***
*************************/

var handleFbookFriendsResponse = function(err, data) {
  if(err) console.log('fbook friend err: ', err);

  var friends = data.data.data;
  Meteor.call('setFriends', Meteor.userId(), friends, function(err, result) {
    if(err) console.log('setFriends err: ', err);
  });

  Session.set('select_friends', true);
  Session.set('friends', friends);
};

var getFbookFriends = function(params) {
  var url = 'https://graph.facebook.com/me/friends';

  Meteor.http.get(url, {params: params}, handleFbookFriendsResponse);
};

var fbookInit = function(func) {
  if(Meteor.user() && !Meteor.loggingIn()) {
    // console.log(Meteor.user());
    var params = {
      access_token: Meteor.user().services.facebook.accessToken
    };
    Meteor.loginWithFacebook({
      requestPermissions: [
        ''
        ]
    }, function() {
      func(params);
    });
  }
};

Template.friends_page.events({
  'click button.fbook.getFriends': function() {
    fbookInit(getFbookFriends);
  }
});

Template.friend.events({
 'click .slider-button': function(e) {
    var status;
    if($(e.target).hasClass('on')) {
      $(e.target).removeClass('on').html('OFF');
      status = false;
    } else {
      $(e.target).addClass('on').html('ON');
      status = true;
    }
    Meteor.call('toggleFriend', Meteor.userId(), this.id, status);
  }
});

Template.fbookFriends.select_friends = function() {
  return Session.get('select_friends') || true;
};

Template.fbookFriends.friends = function() {
  return Session.get('friends');// || Meteor.users.findOne({_id: Meteor.userId()}, {friends:1}).friends;
};

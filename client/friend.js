Meteor.subscribe('friendData');

Deps.autorun(function() {
  if(Meteor.user() && Friends.findOne({})) {
    if(!Session.get('friendListLetter'))
      Session.set('friendListLetter', 'A');
    var friends = Friends.findOne({}).friendsList;
    if(friends) {
      friends = _.sortBy(friends, function(friend) {
        return friend.name;
      });
      if(Session.get('friendListLetter')) {
        Session.set('friends', _.filter(friends, function(friend) {
          return friend.name.charAt(0).toUpperCase() === Session.get('friendListLetter');
        }));
      } else
        Session.set('friends', friends);
    }
  }
});

/*************************
*** Facebook Functions ***
*************************/

var handleFbookFriendsResponse = function(err, data) {
  if(err) console.log('fbook friend err: ', err);

  var friends = data.data.data;
  console.log(friends);
  Meteor.call('insertFriends', friends, function(err, result) {
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
  },

  'click .friendSlider li': function(e) {
    $('li.letter').removeClass('highlight');
    $(e.target).addClass('highlight');
    Session.set('friendListLetter', $(e.target).text());
  }
});

Template.friend.preserve({
  '.slider-button[id]': function(node) {
    return node.id;
  }
});

Template.friend.events({
 'click .slider-button': function(e) {
    var status;
    var $node = $(e.target);
    console.log(e.target);
    $node.toggleClass('on');
    if($node.hasClass('on')) {
      status = true;
      $node.addClass('slide-left');
      $node.removeClass('slide-right');
    } else {
      status = false;
      $node.addClass('slide-left');
      $node.removeClass('slide-right');
    }
    Meteor.call('toggleFriend', this.id, status);
  }
});

Template.fbookFriends.friends = function() {
  return Session.get('friends');
};

Template.friends_page.letters = function() {
  var letters = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
  return _.map(letters, function(let) {
    return {letter: let};
  });
};

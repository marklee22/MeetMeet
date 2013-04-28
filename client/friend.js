Meteor.subscribe('friendData');

Deps.autorun(function() {
  if(Meteor.user() && Friends.findOne({})) {
    if(!Session.get('friendListLetter')) {
      Session.set('friendListLetter', 'A');
    }
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

/****************
*** TEMPLATES ***
****************/

Template.friends_page.rendered = function() {
  $('#letter-' + Session.get('friendListLetter')).removeClass('btn-inverse').addClass('btn-primary');
};

Template.friends_page.showInstructions = function() {
  return Session.get('showFriendPrefs');
};

Template.friends_page.events({
  'click button.fbook.getFriends': function() {
    fbookInit(getFbookFriends);
  },

  'click .friendSlider button': function(e) {
    $('button.letter').removeClass('btn-primary');
    $('button.letter').addClass('btn-inverse');
    $(e.target).removeClass('btn-inverse');
    $(e.target).addClass('btn-primary');
    Session.set('friendListLetter', $(e.target).text());
  },

  'click #hideFriendPrefs': function() {
    Session.set('showFriendPrefs', false);
  },

  'click #showFriendPrefs': function() {
    Session.set('showFriendPrefs', true);
  }
});

Template.friend.events({
 'click .friend-select': function(e) {
    console.log(e.target);

    // Check if changing from true or false
    var status = $(e.target).hasClass('btn-success') ? false : true;

    // Toggle classes
    $(e.target).toggleClass('btn-success');
    $(e.target).toggleClass('btn-danger');

    // Write to database the change
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

Accounts.ui.config({
  requestPermissions: {
    google: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  },
  requestOfflineToken: {
    google: true
  },
  passwordSignupFields: 'EMAIL_ONLY'
});

/**************
*** SIGN IN ***
**************/

Template.signin_page.events({
  'submit': function(e) {
    e.preventDefault();
    // console.log($('#inputEmail').val(), $('#inputPassword').val());
    Meteor.loginWithPassword($('#inputEmail').val(), $('#inputPassword').val(), function(err) {
      if(err) {
        Session.set('alert', {class: 'alert-error', type:'ERROR', msg: err});
      }
    });
  }
});

Template.signin_button.user = function() {
  return Meteor.user();
};

Template.signin_button.title = function() {
  return Meteor.user() ? Meteor.user().profile.name : 'Sign In';
};

Template.signin_button.events({
  'click a.dropdown-toggle': function(e) {
    $(e.target).closest('li.dropdown').toggleClass('open');
    console.log(e.target);
  },

  'click .signin-button': function(e) {
    e.preventDefault();
    Meteor.loginWithPassword($('#signin-email').val(), $('#signin-password').val(), function(err) {
      if(err) {
        Session.set('alert', err);
        console.log(err);
      }
    });
  },

  'click .signout-button': function(e) {
    e.preventDefault();

    // Remove all Session variables
    _.each(Session.keys, function(value, key) {
      Session.set(key, undefined);
    });
    Meteor.logout();
  }
});

/**************
*** SIGN UP ***
**************/

var validatePassword = function() {
  var password = $('#inputPassword').val();
  var confirmation = $('#inputPasswordConfirmation').val();
  if(password !== confirmation)
    return false;
  else if(password.length < 6)
    return false;
  else
    return true;
};

Template.signup_page.events({
  'submit': function(e) {
    e.preventDefault();

    // Check password integrity
    if(validatePassword()) {
      Accounts.createUser({
        email: $('#inputEmail').val(),
        password: $('#inputPassword').val(),
        profile: {
          name: $('#inputName').val(),
          location: $('#inputLocation').val()
        }
      }, function(err) {
        if(!err) Meteor.Router.to('/');
        console.log('err - ', err);
      });
    } else {
      alert('Error validating password');
    }
  }
});

/****************
*** FORGOT PW ***
****************/

Template.forgot_password_page.events({
  'submit': function(e) {
    e.preventDefault();
    Accounts.forgotPassword({email: $('#inputEmail').val()}, function(err) {
      console.log('err -', err);
    });
  }
});
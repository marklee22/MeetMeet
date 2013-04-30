/*************
*** ROUTER ***
*************/

Meteor.Router.add({
  '/': 'main_page',
  '/calendar': 'calendar_page',
  '/friends': 'friends_page',
  '/about': 'about_page',
  '/FAQ': 'faq_page',
  '/signup': function() {
    if(Meteor.user())
      return 'main_page';
    else
      return 'signup_page';
  },
  '/forgot_password': 'forgot_password_page',
  '/contact': 'contact_page',
  '/splash': 'splash_page'
});

Meteor.Router.filters({
  'checkLoggedIn': function(page) {
    if(Meteor.loggingIn()) {
      return 'loading_page';
    } else if(Meteor.user()) {
      return page;
    } else {
      return 'splash_page';
    }
  },

  // Redirect to home if signed up or signing in
  'newUser': function(page) {
    if(Meteor.user().isNewUser) {
      // Session.set('alert', {class: 'alert-info', type: 'INFO', msg: 'Please complete the following steps first'});
      if(Meteor.user().services.facebook && Meteor.user().services.google) {
        Meteor.call('userSettingsComplete');
        Meteor.Router.to('/');
      } else
        return 'settings_page';
    } else
      return page;
  },

  // Clear alert every page change
  'clearAlert': function(page) {
    Session.set('alert', undefined);
    return page;
  }
});

Meteor.Router.filter('clearAlert', {except: ['settings_page']});
Meteor.Router.filter('checkLoggedIn', {only: ['main_page', 'friends_page', 'calendar_page']});
Meteor.Router.filter('newUser', {only: ['main_page', 'friends_page', 'calendar_page']});

/********************
*** HEADER/FOOTER ***
********************/

Template.header.user = function() {
  return Meteor.user();
};

/************
*** ALERT ***
************/

Template.alert.alertMsg = function() {
  return Session.get('alert');
};

Template.alert.events({
  'click .close': function() {
    Session.set('alert', undefined);
  }
});

/*********************
*** USER SETTINGS ***
*********************/

Template.settings_page.selectCalendars = function() {
  return Session.get('selectCalendars');
};

Template.settings_page.events({
  'click #importCals': function(e) {
    e.preventDefault();
    var importedCals = [],
        ignoredCals = [];

    // Set all checked calendars to import = true
    _.each($('input:checkbox:checked'), function(cal) {
      Meteor.call('setCalendar', $(cal).val(), true);
    });

    // Set all unchecked calendars to import = false
    _.each($('input:checkbox:not(:checked)'), function(cal) {
      Meteor.call('setCalendar', $(cal).val(), false);
    });

    // Done selecting calendars
    Session.set('selectCalendars', false);
  }
});
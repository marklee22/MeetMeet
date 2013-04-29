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
  'redirectToHome': function(page) {

  }
});

Meteor.Router.filter('checkLoggedIn', {only: ['main_page', 'friends_page', 'calendar_page']});

/********************
*** HEADER/FOOTER ***
********************/

Template.header.user = function() {
  return Meteor.user();
};

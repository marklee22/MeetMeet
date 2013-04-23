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
  '/map': 'map_page',
  '/signup': 'signup_page',
  '/forgot_password': 'forgot_password_page'
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

/****************
*** TEMPLATES ***
****************/

Template.page.currentPage = function() {
  return 'The current page is: ' + Meteor.Router.page();
};

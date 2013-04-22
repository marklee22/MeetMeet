Template.signin_page.events({
  'submit': function(e) {
    e.preventDefault();
    // console.log($('#inputEmail').val(), $('#inputPassword').val())
    Meteor.loginWithPassword($('#inputEmail').val(), $('#inputPassword'), function(err) {
      if(err) {
        Session.set('alert', err);
        alert(err);
      }
    });
  }
});
if (Meteor.isClient) {

  Template.gCalendar.load = function() {

  };

  Template.hello.greeting = function () {
    return "Welcome to friendster.";
  };

  Template.hello.events({
    'click input' : function () {
      // template data, if any, is available in 'this'
      if (typeof console !== 'undefined')
        console.log("You pressed the button");
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    // Accounts.loginServiceConfiguration.remove({
    //   service: "google"
    // });
    // Accounts.loginServiceConfiguration.insert({
    //   service: "google",
    //   clientId: "797898464687.apps.googleusercontent.com",
    //   secret: "yvantePDeLe-jQDDRddZRpG-"
    // });
  });
}

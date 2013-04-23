Accounts.onCreateUser(function(options, user) {
  console.log(options, user);
  // if(options.services && options.services.google && options.services.google.email)
    // if(Meteor.users.find({'emails.address': options.services.google.email}))
  if(options.profile)
    user.profile = options.profile;
  return user;
});

Accounts.config({
  sendVerificationEmail: false
});

Accounts.validateNewUser(function (user) {
  var service = user.services.google || user.services.facebook;

  if (! service)
    return true;

  var email = service.email;

  var existingUser = Meteor.users.findOne({$or: [{'emails.address': email}, {'services.google.email': email}, {'services.facebook.email': email}]});

  if (! existingUser)
    return true;

  if (user.services.google) {
    Meteor.users.update({_id: existingUser._id}, {
      $set: {
        'profile': user.profile,
        'services.google': user.services.google
      },
      $push: {
        'services.resume.loginTokens': user.services.resume.loginTokens[0]
      }
    });
  } else {
    Meteor.users.update({_id: existingUser._id}, {
      $set: {
        'profile': user.profile,
        'services.facebook': user.services.facebook
      },
      $push: {
        'services.resume.loginTokens': user.services.resume.loginTokens[0]
      }
    });
  };

  throw new Meteor.Error(205, "Successfully added authorization with your existing account.");
});
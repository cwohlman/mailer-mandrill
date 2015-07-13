// to test this package, provide your own api key in mailer-mandrill-testkeys.js
// your code should look like this:
// 
// MandrillMailer = Mandrill.init({
//   apiKey: "yourkeyhere"
//   , inboundDomain: 'yourdomain.com'
//   , standalone: true
// });
// 

Tinytest.add('Mandrill Mailer - marks email with sent id', function (test) {
  var email = MandrillMailer.send({
    from: 'support@example.com'
    , to: 'user@example.com'
    , text: 'My message'
    , html: 'Hi there'
  });

  test.equal(_.isString(email.providerId), true);
  test.equal(email.deliveredStatus, 'sent');
});

var message;
MandrillMailer.config.threading = {
  setOutboundProperties: function (email) {
    message = email;
  }
};

Tinytest.addAsync('Mandrill Mailer - creates webhook', function (test, done) {

  var email = MandrillMailer.send({
    from: 'support@example.com'
    , to: 'user@' + Mandrill.config.inboundDomain
    , text: 'My message'
    , html: 'Hi there'
  });
  Meteor.setTimeout(function () {
    test.equal(_.isObject(message), true);
    if (message) {
      test.equal(message.from, 'support@example.com');
      test.equal(message.to, 'user@' + Mandrill.config.inboundDomain);
      test.matches(message.text, /My message/);
      test.matches(message.html, /Hi there/);
    }
    done();
  }, 10000);
});
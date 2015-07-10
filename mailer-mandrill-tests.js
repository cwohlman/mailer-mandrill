// to test this package, provide your own api key in mailer-mandrill-testkeys.js
// your code should look like this:
// 
// MandrillMailer = Mandrill.init({
//   apiKey: "yourkeyhere"
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
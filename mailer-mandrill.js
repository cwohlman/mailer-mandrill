Mandrill = {
  config: {
    baseUrl: 'https://mandrillapp.com/api/1.0'
  }
};

function makeRequest(endpoint, data) {
  var url = Mandrill.config.baseUrl + endpoint;
  return HTTP.post(url, {
    data: _.extend(data, {
      key: Mandrill.config.apiKey
    })
  });
}

/**
 * Sends an email using the mandrill api
 * @method Mandrill.send
 * @param {object} email The email to send, an object formatted similarly to meteor's Email.send
 */
Mandrill.send = function (email) {
  var mandrillFormattedMessage = {
    html: email.html
    , text: email.text
    , from_email: email.from
    , to: [{
      email: email.to
    }]
    , headers: email.headers
    // XXX store useful metadata on mandrill's servers
    // , metadata: 
    // XXX support attachements and images
  };

  var result = makeRequest('/messages/send.json', {
    message: mandrillFormattedMessage
  }).data;


  var response = result[0];

  console.log(response);

  if (response) {
    email.providerId = response._id;
    email.deliveredStatus = response.status;
    email.sent = true;    
  }

};

/**
 * Initializes this mandrill instance using the provided credentials and options
 * @method Mandrill.init
 * @param {object} options Any options you want to specify
 */

Mandrill.init = function (options) {
  // attach to a mailer
  var mailer;
  if (options.standalone)
    mailer = Mailer.factory(null, {defaultServiceProvider: Mandrill.send});
  else {
    mailer = Mailer;
    if (Mailer.config)
      Mailer.config.defaultServiceProvider = Mandrill.send;
    else
      Meteor.startup(function () {
        Mailer.config.defaultServiceProvider = Mandrill.send;
      });
  }

  if (options.recieve) {
    // XXX setup webhook to recieve emails
  }

  _.extend(Mandrill.config, _.pick(options, 'apiKey'));

  return mailer;
};

if (Meteor.settings && Meteor.settings.mandrill)
  Mandrill.init(Meteor.settings.mandrill);
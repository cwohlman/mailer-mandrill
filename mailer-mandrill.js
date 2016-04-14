Mandrill = {
  config: {
    baseUrl: 'https://mandrillapp.com/api/1.0'
    , inboundRoute: 'mandrill/inbound'
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

function parseEmailAddress(addressOrArray) {
  var emails = addressOrArray;
  if (!_.isArray(emails))
    emails = [emails];
  return _.map(emails, function (email) {
    var name = /"([^"]+)"/.exec(email);
    var address = /<([^>]+)>/.exec(email);
    if (address) {
      name = name && name[1];
      address = address[1];
      return {
        email: address
        , name: name
      };
    } else {
      return {
        email: email
      };
    }
  });
}

/**
 * Sends an email using the mandrill api
 * @method Mandrill.send
 * @param {object} email The email to send, an object formatted similarly to meteor's Email.send
 */
Mandrill.send = function (email) {
  if(!Mandrill.config.apiKey) return;

  var fromEmail = parseEmailAddress(email.from);
  var mandrillFormattedMessage = {
    html: email.html
    , text: email.text
    , subject: email.subject
    , from_email: fromEmail[0].email
    , from_name: fromEmail[0].name
    , to: parseEmailAddress(email.to)
    , track_opens: !!Mandrill.config.tracking
    , track_clicks: !!Mandrill.config.tracking
    , headers: email.headers
    // XXX store useful metadata on mandrill's servers
    // , metadata: 
    // XXX support attachements and images
  };

  // Mandrill wierdly doesn't support replyTo directly, you have to write
  // it as a custom header :/
  if (email.replyTo)
    mandrillFormattedMessage.headers = _.extend(mandrillFormattedMessage.headers || {}, {
      "Reply-To": email.replyTo
    });

  var result = makeRequest('/messages/send.json', {
    message: mandrillFormattedMessage
  }).data;


  var response = result[0];

  if (response) {
    email.providerId = response._id;
    email.deliveredStatus = response.status;
    email.sent = true;    
  }

};

/**
 * Uses the mandrill api to create an inbound mail route to handle mail sent
 * to your domain.
 *
 * @method Mandrill.attachRoute
 * @param {string} domainName the domain at which emails will be recieved
 * @param {string} routeName the path on your server where inbound mail should be recieved
 */
Mandrill.attachRoute = function (domainName, routeName, mailer) {
  Router.route(routeName, {
    where: 'server'
  }).post(function () {
    var inboundEvents = JSON.parse(this.request.body.mandrill_events);
    var emails = _.map(inboundEvents, function (event) {
      var message = event.msg;
      var email = {
        from: message.from_email
        , to: message.email
        , subject: message.subject
        , text: message.text
        , html: message.html
      };
      mailer.send('recieve', email);
    });
    this.response.end('success');
  });

  // Wrapping this in a startup + timeout accomplishes two goals:
  // 1. No startup delay
  // 2. Errors are logged, but do not crash the server
  Meteor.startup(function () {
    Meteor.setTimeout(function () {
      var pattern = "*";
      var url = Meteor.absoluteUrl(routeName);
      var routes = makeRequest('/inbound/routes.json', {
        domain: domainName
      }).data;
      var mailerRoute;
      _.each(routes, function (route) {
        if (route.pattern === pattern) {
          if (mailerRoute) {
            makeRequest('/inbound/delete-route.json', {
              id: route.id
            });
          } else
            mailerRoute = route;
        }
      });
      if (mailerRoute) {
        makeRequest('/inbound/update-route.json', {
          id: mailerRoute.id
          , pattern: '*'
          , url: url
        });
      } else {
        makeRequest('/inbound/add-route.json', {
          domain: domainName
          , pattern: '*'
          , url: url
        });
      }
    });
  });
};

/**
 * Initializes this mandrill instance using the provided credentials and options
 * @method Mandrill.init
 * @param {object} options Any options you want to specify
 */

Mandrill.init = function (options) {
  // attach to a mailer
  var mailer;

  options = _.extend(Mandrill.config, options);

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

  if (options.inboundDomain) {
    try {
      Mandrill.attachRoute(options.inboundDomain, options.inboundRoute, mailer);
    } catch (e) { console.error(e); }
  }

  return mailer;
};

if (Meteor.settings && Meteor.settings.mandrill)
  Mandrill.init(Meteor.settings.mandrill);
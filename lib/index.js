
'use strict';

var	inherits = require('util').inherits,
  Steppy = require('twostep').Steppy,
  _ = require('underscore'),
  nodemailer = require('nodemailer');


exports.register = function(app) {
  var ParentTransport = app.lib.notifier.BaseNotifierTransport,
    logger = app.lib.logger('mail notifier');

  function Transport() {
    ParentTransport.call(this);
  }

  inherits(Transport, ParentTransport);

  Transport.prototype.init = function(params, callback) {
    this.transport = nodemailer.createTransport(params);
    callback();
  };

  Transport.prototype._subjectTemplate = _(
    '<%= build.project.name %><% if (version) { %> version <%= version %><% } %> build #<%= build.number %> ' +
    'is <%= build.status %>'
  ).template();

  Transport.prototype._bodyTemplate = _(
    '<%= build.project.name %> build ' +
    '<a href="<%= baseUrl %>/builds/<%= build.id %>"> #<%= build.number %> </a> ' +
    'status is <%= build.status %>' +
    '<% if (changes.length) { %>' +
      ', scm changes:<br>' +
      '<% _(changes).each(function(change, index) { %>' +
        '<%= change.author %>: <%= change.comment %>' +
        '<% if (changes[index + 1]) { %>' +
          '<br>' +
        '<% } %>' +
      '<% }); %>' +
    '<% } else { %>' +
      ', no scm changes' +
    '<% } %>'
  ).template();

  Transport.prototype.send = function(params, callback) {
    var self = this,
      build = params.build,
      changes = build.scm && build.scm.changes || [],
      cfg = build.project.notify.to.mail,
      recipients = cfg.recipients,
      sender = cfg.sender;

    if (!recipients && !recipients.length) {
      logger.log('no recipients, quit');
      return;
    }

    Steppy(
      function() {
        app.builds.getLogLines({ buildId: build.id }, this.slot());
      },
      function(err, tail) {
        var attachments = [];

        if (!err && tail) {
          var lines = _.pluck(tail['lines'], 'text');
          if (cfg.versionMatch) {
            var versionRx = new RegExp(cfg.versionMatch);
            var version = _.find(_.map(lines, function(txt) {
              var m = txt.match(versionRx);
              return m ? m[1] : m;
            }))
            logger.log('detected version: %s', version);
          }
          if (build.status == 'error') {
            logger.log('attaching log file')
            attachments.push({
              filename: build.project.name + '.txt',
              content: lines.join('\n'),
              contentType: 'text/plain'
            });
          }
        }

        logger.log('send mail to %s', recipients);

        var subject = self._subjectTemplate({build: build, version: version}),
          body = self._bodyTemplate({
            build: build,
            changes: changes,
            baseUrl: app.config.http.url
          });

        self.transport.sendMail({
          from: sender,
          subject: subject,
          html: body,
          to: recipients.join(','),
          attachments: attachments
        }, this.slot());
      },
      callback
    );
  };

  app.lib.notifier.register('mail', Transport);
};

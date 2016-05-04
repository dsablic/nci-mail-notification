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
		'<%= build.project.name %> build #<%= build.number %> ' +
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
			recipients = build.project.notify.to.mail.recipients,
			sender = build.project.notify.to.mail.sender;

		if (!recipients && !recipients.length) {
			logger.log('no recipients, quit');
			return;
		}

		Steppy(
			function() {
				logger.log('send mail to %s', recipients);

				var subject = self._subjectTemplate({build: build}),
					body = self._bodyTemplate({
						build: build,
						changes: changes,
						baseUrl: app.config.http.url
					});

				self.transport.sendMail({
					from: sender,
					subject: subject,
					html: body,
					to: recipients.join(',')
				}, this.slot());
			},
			callback
		);
	};

	app.lib.notifier.register('mail', Transport);
};

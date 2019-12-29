// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

frappe.last_edited_communication = {};
frappe.standard_replies = {};

frappe.views.CommunicationComposer = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.make();
	},
	make: function() {
		var me = this;
		this.dialog = new frappe.ui.Dialog({
			title: (this.title || this.subject || __("New Email")),
			no_submit_on_enter: true,
			fields: this.get_fields(),
			primary_action_label: __("Send"),
			primary_action: function() {
				me.send_action();
			}
		});

		$(document).on("upload_complete", function(event, attachment) {
			if(me.dialog.display) {
				var wrapper = $(me.dialog.fields_dict.select_attachments.wrapper);

				// find already checked items
				var checked_items = wrapper.find('[data-file-name]:checked').map(function() {
					return $(this).attr("data-file-name");
				});

				// reset attachment list
				me.render_attach();

				// check latest added
				checked_items.push(attachment.name);

				$.each(checked_items, function(i, filename) {
					wrapper.find('[data-file-name="'+ filename +'"]').prop("checked", true);
				});
			}
		})
		this.prepare();
		this.dialog.show();
	},

	get_fields: function() {
		var fields= [
			{label:__("To"), fieldtype:"Data", reqd: 0, fieldname:"recipients",length:524288},
			{fieldtype: "Section Break", collapsible: 1, label: __("CC, BCC & Standard Reply")},
			{label:__("CC"), fieldtype:"Data", fieldname:"cc", length:524288},
			{label:__("BCC"), fieldtype:"Data", fieldname:"bcc", length:524288},
			{label:__("Standard Reply"), fieldtype:"Link", options:"Standard Reply",
				fieldname:"standard_reply"},
			{fieldtype: "Section Break"},
			{label:__("Subject"), fieldtype:"Data", reqd: 1,
				fieldname:"subject", length:524288},
			{fieldtype: "Section Break"},
			{label:__("Message"), fieldtype:"Text Editor", reqd: 1,
				fieldname:"content"},
			{fieldtype: "Section Break"},
			{fieldtype: "Column Break"},
			{label:__("Send As Email"), fieldtype:"Check",
				fieldname:"send_email"},
			{label:__("Send me a copy"), fieldtype:"Check",
				fieldname:"send_me_a_copy", 'default': frappe.boot.user.send_me_a_copy},
			{label:__("Send Read Receipt"), fieldtype:"Check",
				fieldname:"send_read_receipt"},
			{label:__("Communication Medium"), fieldtype:"Select",
				options: ["Phone", "Chat", "Email", "SMS", "Visit", "Other"],
				fieldname:"communication_medium"},
			{label:__("Sent or Received"), fieldtype:"Select",
				options: ["Received", "Sent"],
				fieldname:"sent_or_received"},
			{label:__("Attach Document Print"), fieldtype:"Check",
				fieldname:"attach_document_print"},
			{label:__("Select Print Format"), fieldtype:"Select",
				fieldname:"select_print_format"},
			{label:__("Select Languages"), fieldtype:"Select",
				fieldname:"language_sel"},
			{fieldtype: "Column Break"},
			{label:__("Select Attachments"), fieldtype:"HTML",
				fieldname:"select_attachments"}
		];

		// add from if user has access to multiple email accounts
		var email_accounts = frappe.boot.email_accounts.filter(function(account, idx){
			return !in_list(["All Accounts", "Sent", "Spam", "Trash"], account.email_account) &&
				account.enable_outgoing
		})
		if(frappe.boot.email_accounts && email_accounts.length > 1) {
			fields = [
				{label: __("From"), fieldtype: "Select", reqd: 1, fieldname: "sender",
					options: email_accounts.map(function(e) { return e.email_id; }) }
			].concat(fields);
		}

		return fields;
	},
	prepare: function() {
		this.setup_subject_and_recipients();
		this.setup_print_language()
		this.setup_print();
		this.setup_attach();
		this.setup_email();
		this.setup_awesomplete();
		this.setup_last_edited_communication();
		this.setup_standard_reply();

		this.dialog.fields_dict.recipients.set_value(this.recipients || '');
		this.dialog.fields_dict.cc.set_value(this.cc || '');
		this.dialog.fields_dict.bcc.set_value(this.bcc || '');

		if(this.dialog.fields_dict.sender) {
			this.dialog.fields_dict.sender.set_value(this.sender || '');
		}
		this.dialog.fields_dict.subject.set_value(this.subject || '');
		this.setup_earlier_reply();
	},

	setup_subject_and_recipients: function() {
		this.subject = this.subject || "";

		if(!this.forward && !this.recipients && this.last_email) {
			this.recipients = this.last_email.sender;
			this.cc = this.last_email.cc;
			this.bcc = this.last_email.bcc;
		}

		if(!this.forward && !this.recipients) {
			this.recipients = this.frm && this.frm.timeline.get_recipient();
		}

		if(!this.subject && this.frm) {
			// get subject from last communication
			var last = this.frm.timeline.get_last_email();

			if(last) {
				this.subject = last.subject;
				if(!this.recipients) {
					this.recipients = last.sender;
				}

				// prepend "Re:"
				if(strip(this.subject.toLowerCase().split(":")[0])!="re") {
					this.subject = __("Re: {0}", [this.subject]);
				}
			}

			if (!this.subject) {
				if (this.frm.subject_field && this.frm.doc[this.frm.subject_field]) {
					this.subject = __("Re: {0}", [this.frm.doc[this.frm.subject_field]]);
				} else {
					let title = this.frm.doc.name;
					if(this.frm.meta.title_field && this.frm.doc[this.frm.meta.title_field]
						&& this.frm.doc[this.frm.meta.title_field] != this.frm.doc.name) {
						title = `${this.frm.doc[this.frm.meta.title_field]} (#${this.frm.doc.name})`;
					}
					this.subject = `${__(this.frm.doctype)}: ${title}`;
				}
			}
		}
	},

	setup_standard_reply: function() {
		var me = this;

		this.dialog.fields_dict["standard_reply"].df.onchange = () => {
			var standard_reply = me.dialog.fields_dict.standard_reply.get_value();

			var prepend_reply = function(reply) {
				if(me.reply_added===standard_reply) {
					return;
				}
				var content_field = me.dialog.fields_dict.content;
				var subject_field = me.dialog.fields_dict.subject;
				var content = content_field.get_value() || "";
				var subject = subject_field.get_value() || "";

				var parts = content.split('<!-- salutation-ends -->');

				if(parts.length===2) {
					content = [reply.message, "<br>", parts[1]];
				} else {
					content = [reply.message, "<br>", content];
				}

				content_field.set_value(content.join(''));
				if(subject === "") {
					subject_field.set_value(reply.subject);
				}

				me.reply_added = standard_reply;
			}

			frappe.call({
				method: 'frappe.email.doctype.standard_reply.standard_reply.get_standard_reply',
				args: {
					template_name: standard_reply,
					doc: me.frm.doc
				},
				callback: function(r) {
					prepend_reply(r.message);
				}
			});
		}
	},

	setup_last_edited_communication: function() {
		var me = this;
		if (!this.doc){
			if (cur_frm){
				this.doc = cur_frm.doctype;
			}else{
				this.doc = "Inbox";
			}
		}
		if (cur_frm && cur_frm.docname) {
			this.key = cur_frm.docname;
		} else {
			this.key = "Inbox";
		}
		if(this.last_email) {
			this.key = this.key + ":" + this.last_email.name;
		}
		if(this.subject){
			this.key = this.key + ":" + this.subject;
		}
		this.dialog.onhide = function() {
			var last_edited_communication = me.get_last_edited_communication();
			$.extend(last_edited_communication, {
				sender: me.dialog.get_value("sender"),
				recipients: me.dialog.get_value("recipients"),
				subject: me.dialog.get_value("subject"),
				content: me.dialog.get_value("content"),
			});
		}

		this.dialog.on_page_show = function() {
			if (!me.txt) {
				var last_edited_communication = me.get_last_edited_communication();
				if(last_edited_communication.content) {
					me.dialog.set_value("sender", last_edited_communication.sender || "");
					me.dialog.set_value("subject", last_edited_communication.subject || "");
					me.dialog.set_value("recipients", last_edited_communication.recipients || "");
					me.dialog.set_value("content", last_edited_communication.content || "");
				}
			}

		}

	},

	get_last_edited_communication: function() {
		if (!frappe.last_edited_communication[this.doc]) {
			frappe.last_edited_communication[this.doc] = {};
		}

		if(!frappe.last_edited_communication[this.doc][this.key]) {
			frappe.last_edited_communication[this.doc][this.key] = {};
		}

		return frappe.last_edited_communication[this.doc][this.key];
	},

	setup_print_language: function() {
		var me = this;
		var doc = this.doc || cur_frm.doc;
		var fields = this.dialog.fields_dict;

		//Load default print language from doctype
		this.lang_code = doc.language

		//On selection of language retrieve language code
		$(fields.language_sel.input).change(function(){
			me.lang_code = this.value
		})

		// Load all languages in the select field language_sel
		$(fields.language_sel.input)
			.empty()
			.add_options(frappe.get_languages())
			.val(doc.language)
	},

	setup_print: function() {
		// print formats
		var fields = this.dialog.fields_dict;

		// toggle print format
		$(fields.attach_document_print.input).click(function() {
			$(fields.select_print_format.wrapper).toggle($(this).prop("checked"));
		});

		// select print format
		$(fields.select_print_format.wrapper).toggle(false);

		if (cur_frm) {
			$(fields.select_print_format.input)
				.empty()
				.add_options(cur_frm.print_preview.print_formats)
				.val(cur_frm.print_preview.print_formats[0]);
		} else {
			$(fields.attach_document_print.wrapper).toggle(false);
		}

	},
	setup_attach: function() {
		var fields = this.dialog.fields_dict;
		var attach = $(fields.select_attachments.wrapper);

		var me = this
		if (!me.attachments){
			me.attachments = []
		}

		var args = {
			args: {
				from_form: 1,
				folder:"Home/Attachments"
			},
			callback: function(attachment, r) { me.attachments.push(attachment); },
			max_width: null,
			max_height: null
		};

		if(me.frm) {
			args = {
				args: (me.frm.attachments.get_args
					? me.frm.attachments.get_args()
					: { from_form: 1,folder:"Home/Attachments" }),
				callback: function (attachment, r) {
					me.frm.attachments.attachment_uploaded(attachment, r)
				},
				max_width: me.frm.cscript ? me.frm.cscript.attachment_max_width : null,
				max_height: me.frm.cscript ? me.frm.cscript.attachment_max_height : null
			}

		}

		$("<h6 class='text-muted add-attachment' style='margin-top: 12px; cursor:pointer;'>"
			+__("Select Attachments")+"</h6><div class='attach-list'></div>\
			<p class='add-more-attachments'>\
			<a class='text-muted small'><i class='octicon octicon-plus' style='font-size: 12px'></i> "
			+__("Add Attachment")+"</a></p>").appendTo(attach.empty())
		attach.find(".add-more-attachments a").on('click',this,function() {
			me.upload = frappe.ui.get_upload_dialog(args);
		})
		me.render_attach()

	},
	render_attach:function(){
		var fields = this.dialog.fields_dict;
		var attach = $(fields.select_attachments.wrapper).find(".attach-list").empty();

		var files = [];
		if (this.attachments && this.attachments.length) {
			files = files.concat(this.attachments);
		}
		if (cur_frm) {
			files = files.concat(cur_frm.get_files());
		}

		if(files.length) {
			$.each(files, function(i, f) {
				if (!f.file_name) return;
				f.file_url = frappe.urllib.get_full_url(f.file_url);

				$(repl('<p class="checkbox">'
					+	'<label><span><input type="checkbox" data-file-name="%(name)s"></input></span>'
					+		'<span class="small">%(file_name)s</span>'
					+	' <a href="%(file_url)s" target="_blank" class="text-muted small">'
					+		'<i class="fa fa-share" style="vertical-align: middle; margin-left: 3px;"></i>'
					+ '</label></p>', f))
					.appendTo(attach)
			});
		}
	},
	setup_email: function() {
		// email
		var me = this;
		var fields = this.dialog.fields_dict;

		if(this.attach_document_print) {
			$(fields.attach_document_print.input).click();
			$(fields.select_print_format.wrapper).toggle(true);
		}

		$(fields.send_email.input).prop("checked", true);

		$(fields.send_me_a_copy.input).on('click', () => {
			// update send me a copy (make it sticky)
			let val = fields.send_me_a_copy.get_value();
			frappe.db.set_value('User', frappe.session.user, 'send_me_a_copy', val);
			frappe.boot.user.send_me_a_copy = val;
		});

		// toggle print format
		$(fields.send_email.input).click(function() {
			$(fields.communication_medium.wrapper).toggle(!!!$(this).prop("checked"));
			$(fields.sent_or_received.wrapper).toggle(!!!$(this).prop("checked"));
			$(fields.send_read_receipt.wrapper).toggle($(this).prop("checked"));
			me.dialog.get_primary_btn().html($(this).prop("checked") ? "Send" : "Add Communication");
		});

		// select print format
		$(fields.communication_medium.wrapper).toggle(false);
		$(fields.sent_or_received.wrapper).toggle(false);

	},

	send_action: function() {
		var me = this;
		var btn = me.dialog.get_primary_btn();

		var form_values = this.get_values();
		if(!form_values) return;

		var selected_attachments =
			$.map($(me.dialog.wrapper)
			.find("[data-file-name]:checked"), function (element) {
				return $(element).attr("data-file-name");
			});


		if(form_values.attach_document_print) {
			if (cur_frm.print_preview.is_old_style(form_values.select_print_format || "")) {
				cur_frm.print_preview.with_old_style({
					format: form_values.select_print_format,
					callback: function(print_html) {
						me.send_email(btn, form_values, selected_attachments, print_html);
					}
				});
			} else {
				me.send_email(btn, form_values, selected_attachments, null, form_values.select_print_format || "");
			}

		} else {
			me.send_email(btn, form_values, selected_attachments);
		}
	},

	get_values: function() {
		var form_values = this.dialog.get_values();

		// cc
		for ( var i=0, l=this.dialog.fields.length; i < l; i++ ) {
			var df = this.dialog.fields[i];

			if ( df.is_cc_checkbox ) {
				// concat in cc
				if ( form_values[df.fieldname] ) {
					form_values.cc = ( form_values.cc ? (form_values.cc + ", ") : "" ) + df.fieldname;
					form_values.bcc = ( form_values.bcc ? (form_values.bcc + ", ") : "" ) + df.fieldname;
				}

				delete form_values[df.fieldname];
			}
		}

		return form_values;
	},

	send_email: function(btn, form_values, selected_attachments, print_html, print_format) {
		var me = this;
		me.dialog.hide();

		if((form_values.send_email || form_values.communication_medium === "Email") && !form_values.recipients) {
			frappe.msgprint(__("Enter Email Recipient(s)"));
			return;
		}

		if(!form_values.attach_document_print) {
			print_html = null;
			print_format = null;
		}

		if(form_values.send_email) {
			if(cur_frm && !frappe.model.can_email(me.doc.doctype, cur_frm)) {
				frappe.msgprint(__("You are not allowed to send emails related to this document"));
				return;
			}

			form_values.communication_medium = "Email";
			form_values.sent_or_received = "Sent";
		}

		return frappe.call({
			method:"frappe.core.doctype.communication.email.make",
			args: {
				recipients: form_values.recipients,
				cc: form_values.cc,
				bcc: form_values.bcc,
				subject: form_values.subject,
				content: form_values.content,
				doctype: me.doc.doctype,
				name: me.doc.name,
				send_email: form_values.send_email,
				print_html: print_html,
				send_me_a_copy: form_values.send_me_a_copy,
				print_format: print_format,
				communication_medium: form_values.communication_medium,
				sent_or_received: form_values.sent_or_received,
				sender: form_values.sender,
				sender_full_name: form_values.sender?frappe.user.full_name():undefined,
				attachments: selected_attachments,
				_lang : me.lang_code,
				read_receipt:form_values.send_read_receipt,
				print_letterhead: me.is_print_letterhead_checked(),
			},
			btn: btn,
			callback: function(r) {
				if(!r.exc) {
					frappe.utils.play_sound("email");

					if(form_values.send_email && r.message["emails_not_sent_to"]) {
						frappe.msgprint(__("Email not sent to {0} (unsubscribed / disabled)",
							[ frappe.utils.escape_html(r.message["emails_not_sent_to"]) ]) );
					}

					if ((frappe.last_edited_communication[me.doc] || {})[me.key]) {
						delete frappe.last_edited_communication[me.doc][me.key];
					}
					if (cur_frm) {
						// clear input
						cur_frm.timeline.input && cur_frm.timeline.input.val("");
						cur_frm.reload_doc();
					}

					// try the success callback if it exists
					if (me.success) {
						try {
							me.success(r);
						} catch (e) {
							console.log(e);
						}
					}

				} else {
					frappe.msgprint(__("There were errors while sending email. Please try again."));

					// try the error callback if it exists
					if (me.error) {
						try {
							me.error(r);
						} catch (e) {
							console.log(e);
						}
					}
				}
			}
		});
	},

	is_print_letterhead_checked: function() {
		if (this.frm && $(this.frm.wrapper).find('.form-print-wrapper').is(':visible')){
			return $(this.frm.wrapper).find('.print-letterhead').prop('checked') ? 1 : 0;
		} else {
			return (frappe.model.get_doc(":Print Settings", "Print Settings") ||
				{ with_letterhead: 1 }).with_letterhead ? 1 : 0;
		}
	},

	setup_earlier_reply: function() {
		var fields = this.dialog.fields_dict,
			signature = frappe.boot.user.email_signature || "",
			last_email = this.last_email;

		if(!last_email) {
			last_email = this.frm && this.frm.timeline.get_last_email(true);
		}

		if(!frappe.utils.is_html(signature)) {
			signature = signature.replace(/\n/g, "<br>");
		}

		if(this.txt) {
			this.message = this.txt + (this.message ? ("<br><br>" + this.message) : "");
		}

		if(this.real_name) {
			this.message = '<p>'+__('Dear') +' '
				+ this.real_name + ",</p><!-- salutation-ends --><br>" + (this.message || "");
		}

		var reply = (this.message || "")
			+ (signature ? ("<br>" + signature) : "");
		var content = '';

		if(last_email) {
			var last_email_content = last_email.original_comment || last_email.content;

			last_email_content = last_email_content
				.replace(/&lt;meta[\s\S]*meta&gt;/g, '') // remove <meta> tags
				.replace(/&lt;style[\s\S]*&lt;\/style&gt;/g, ''); // // remove <style> tags

			var communication_date = last_email.communication_date || last_email.creation;
			content = '<div><br></div>'
				+ reply
				+ "<br><!-- original-reply --><br>"
				+ '<blockquote>' +
					'<p>' + __("On {0}, {1} wrote:",
					[frappe.datetime.global_date_format(communication_date) , last_email.sender]) + '</p>' +
					last_email_content +
				'<blockquote>';
		} else {
			content = "<div><br></div>" + reply;
		}
		fields.content.set_value(content);
	},
	setup_awesomplete: function() {
		var me = this;
		[
			this.dialog.fields_dict.recipients.input,
			this.dialog.fields_dict.cc.input,
			this.dialog.fields_dict.bcc.input
		].map(function(input) {
			me.setup_awesomplete_for_input(input);
		});
	},
	setup_awesomplete_for_input: function(input) {
		function split(val) {
			return val.split( /,\s*/ );
		}
		function extractLast(term) {
			return split(term).pop();
		}

		var awesomplete = new Awesomplete(input, {
			minChars: 0,
			maxItems: 99,
			autoFirst: true,
			list: [],
			item: function(item, input) {
				return $('<li>').text(item.value).get(0);
			},
			filter: function(text, input) { return true },
			replace: function(text) {
				var before = this.input.value.match(/^.+,\s*|/)[0];
				this.input.value = before + text + ", ";
			}
		});
		var delay_timer;
		var $input = $(input);
		$input.on("input", function(e) {
			clearTimeout(delay_timer);
			delay_timer = setTimeout(function() {
				var term = e.target.value;
				frappe.call({
					method:'frappe.email.get_contact_list',
					args: {
						'txt': extractLast(term) || '%'
					},
					quiet: true,
					callback: function(r) {
						awesomplete.list = r.message || [];
					}
				});
			},250);
		});
	}
});

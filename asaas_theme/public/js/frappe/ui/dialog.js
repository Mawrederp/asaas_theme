// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

frappe.provide('frappe.ui');

var cur_dialog;

frappe.ui.open_dialogs = [];
frappe.ui.Dialog = frappe.ui.FieldGroup.extend({
	init: function(opts) {
		this.display = false;
		this.is_dialog = true;

		$.extend(this, opts);
		this._super();
		this.make();
	},
	make: function() {
		this.$wrapper = frappe.get_modal("", "");
		this.wrapper = this.$wrapper.find('.modal-dialog')
			.get(0);
		this.make_head();
		this.body = this.$wrapper.find(".modal-body").get(0);
		this.header = this.$wrapper.find(".modal-header");

		// make fields (if any)
		this._super();

		// show footer
		if(this.primary_action) {
			this.set_primary_action(this.primary_action_label || __("Submit"), this.primary_action);
		}

		if (this.secondary_action_label) {
			this.get_close_btn().html(this.secondary_action_label);
		}

		var me = this;
		this.$wrapper
			.on("hide.bs.modal", function() {
				me.display = false;
				if(frappe.ui.open_dialogs[frappe.ui.open_dialogs.length-1]===me) {
					frappe.ui.open_dialogs.pop();
					if(frappe.ui.open_dialogs.length) {
						cur_dialog = frappe.ui.open_dialogs[frappe.ui.open_dialogs.length-1];
					} else {
						cur_dialog = null;
					}
				}
				me.onhide && me.onhide();
				me.on_hide && me.on_hide();
			})
			.on("shown.bs.modal", function() {
				// focus on first input
				me.display = true;
				cur_dialog = me;
				frappe.ui.open_dialogs.push(me);
				me.focus_on_first_input();
				me.on_page_show && me.on_page_show();
			})
			.on('scroll', function() {
				var $input = $('input:focus');
				if($input.length && ['Date', 'Datetime',
					'Time'].includes($input.attr('data-fieldtype'))) {
					$input.blur();
				}
			});

	},
	get_primary_btn: function() {
		return this.$wrapper.find(".modal-header .btn-primary");
	},
	set_primary_action: function(label, click) {
		this.has_primary_action = true;
		var me = this;
		return this.get_primary_btn()
			.removeClass("hide")
			.html(label)
			.click(function() {
				me.primary_action_fulfilled = true;
				// get values and send it
				// as first parameter to click callback
				// if no values then return
				var values = me.get_values();
				if(!values) return;
				click.apply(me, [values]);
			});
	},
	disable_primary_action: function() {
		this.get_primary_btn().addClass('disabled');
	},
	enable_primary_action: function() {
		this.get_primary_btn().removeClass('disabled');
	},
	make_head: function() {
		var me = this;
		this.set_title(this.title);
	},
	set_title: function(t) {
		this.$wrapper.find(".modal-title").html(t);
	},
	show: function() {
		// show it
		this.$wrapper.modal("show");
		this.primary_action_fulfilled = false;
		this.is_visible = true;
	},
	hide: function(from_event) {
		this.$wrapper.modal("hide");
		this.is_visible = false;
	},
	get_close_btn: function() {
		return this.$wrapper.find(".btn-modal-close");
	},
	no_cancel: function() {
		this.get_close_btn().toggle(false);
	},
	cancel: function() {
		this.get_close_btn().trigger("click");
	}
});


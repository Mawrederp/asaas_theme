// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

frappe.provide("frappe.workflow");

frappe.workflow = {
	state_fields: {},
	workflows: {},
	setup: function(doctype) {
		var wf = frappe.get_list("Workflow", {document_type: doctype});
		if(wf.length) {
			frappe.workflow.workflows[doctype] = wf[0];
			frappe.workflow.state_fields[doctype] = wf[0].workflow_state_field;
		} else {
			frappe.workflow.state_fields[doctype] = null;
		}
	},
	get_state_fieldname: function(doctype) {
		if(frappe.workflow.state_fields[doctype]===undefined) {
			frappe.workflow.setup(doctype);
		}
		return frappe.workflow.state_fields[doctype];
	},
	get_default_state: function(doctype, docstatus) {
		frappe.workflow.setup(doctype);
		var value = null;
		$.each(frappe.workflow.workflows[doctype].states, function(i, workflow_state) {
			if(cint(workflow_state.doc_status)===cint(docstatus)) {
				value = workflow_state.state;
				return false;
			}
		});
		return value;
	},
	get_transitions: function(doctype, state) {
		frappe.workflow.setup(doctype);
		return frappe.get_children(frappe.workflow.workflows[doctype], "transitions", {state:state});
	},
	get_document_state: function(doctype, state) {
		frappe.workflow.setup(doctype);
		return frappe.get_children(frappe.workflow.workflows[doctype], "states", {state:state})[0];
	},
	get_next_state: function(doctype, state, action) {
		return frappe.get_children(frappe.workflow.workflows[doctype], "transitions", {
			state:state, action:action})[0].next_state;
	},
	is_read_only: function(doctype, name) {
		var state_fieldname = frappe.workflow.get_state_fieldname(doctype);
		if(state_fieldname) {
			var doc = locals[doctype][name];
			if(!doc)
				return false;
			if(doc.__islocal)
				return false;

			var state = doc[state_fieldname] ||
				frappe.workflow.get_default_state(doctype, doc.docstatus);

			var allow_edit = state ? frappe.workflow.get_document_state(doctype, state) && frappe.workflow.get_document_state(doctype, state).allow_edit : null;

			if(!frappe.user_roles.includes(allow_edit)) {
				return true;
			}
		}
		return false;
	},
	get_update_fields: function(doctype) {
		var update_fields = $.unique($.map(frappe.workflow.workflows[doctype].states || [],
			function(d) {
				return d.update_field;
			}));
		return update_fields;
	}
};

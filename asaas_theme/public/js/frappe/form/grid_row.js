frappe.ui.form.GridRow = Class.extend({
	init: function(opts) {
		this.on_grid_fields_dict = {};
		this.on_grid_fields = [];
		this.columns = {};
		this.columns_list = [];
		$.extend(this, opts);
		this.row_check_html = '<input type="checkbox" class="grid-row-check pull-left">';
		this.make();
	},
	make: function() {
		var me = this;

		this.wrapper = $('<div class="grid-row"></div>').appendTo(this.parent).data("grid_row", this);
		this.row = $('<div class="data-row row"></div>').appendTo(this.wrapper)
			.on("click", function(e) {
				if($(e.target).hasClass('grid-row-check') || $(e.target).hasClass('row-index') || $(e.target).parent().hasClass('row-index')) {
					return;
				}
				if(me.grid.allow_on_grid_editing() && me.grid.is_editable()) {
					// pass
				} else {
					me.toggle_view();
					return false;
				}
			});

		// no checkboxes if too small
		// if(this.is_too_small()) {
		// 	this.row_check_html = '';
		// }

		if(this.grid.template && !this.grid.meta.editable_grid) {
			this.render_template();
		} else {
			this.render_row();
		}
		if(this.doc) {
			this.set_data();
		}
	},
	set_data: function() {
		this.wrapper.data({
			"doc": this.doc
		})
	},
	set_row_index: function() {
		if(this.doc) {
			this.wrapper
				.attr('data-name', this.doc.name)
				.attr("data-idx", this.doc.idx)
				.find(".row-index span, .grid-form-row-index").html(this.doc.idx)

		}
	},
	select: function(checked) {
		this.doc.__checked = checked ? 1 : 0;
	},
	refresh_check: function() {
		this.wrapper.find('.grid-row-check').prop('checked', this.doc ? !!this.doc.__checked : false);
		this.grid.refresh_remove_rows_button();
	},
	remove: function() {
		var me = this;
		if(this.grid.is_editable()) {
			if(this.frm) {
				if(this.get_open_form()) {
					this.hide_form();
				}

				frappe.run_serially([
					() => {
						return this.frm.script_manager.trigger("before_" + this.grid.df.fieldname + "_remove",
							this.doc.doctype, this.doc.name);
					},
					() => {
						frappe.model.clear_doc(this.doc.doctype, this.doc.name);

						this.frm.script_manager.trigger(this.grid.df.fieldname + "_remove",
							this.doc.doctype, this.doc.name);
						this.frm.dirty();
						this.grid.refresh();
					},
				]).catch((e) => {
					// aborted
					console.trace(e); // eslint-disable-line
				});
			} else {
				this.grid.df.data = this.grid.df.data.filter(function(d) {
					return d.name !== me.doc.name;
				})
				// remap idxs
				this.grid.df.data.forEach(function(d, i) {
					d.idx = i+1;
				});

				this.grid.refresh();
			}
		}
	},
	insert: function(show, below) {
		var idx = this.doc.idx;
		if(below) idx ++;
		this.toggle_view(false);
		this.grid.add_new_row(idx, null, show);
	},
	refresh: function() {
		if(this.frm && this.doc) {
			this.doc = locals[this.doc.doctype][this.doc.name];
		}
		// re write columns
		this.visible_columns = null;

		if(this.grid.template && !this.grid.meta.editable_grid) {
			this.render_template();
		} else {
			this.render_row(true);
		}

		// refersh form fields
		if(this.grid_form) {
			this.grid_form.layout && this.grid_form.layout.refresh(this.doc);
		}
	},
	render_template: function() {
		this.set_row_index();

		if(this.row_display) {
			this.row_display.remove();
		}
		var index_html = '';

		// row index
		if(this.doc) {
			if(!this.row_index) {
				this.row_index = $('<div style="float: left; margin-left: 15px; margin-top: 8px; \
					margin-right: -20px;">'+this.row_check_html+' <span></span></div>').appendTo(this.row);
			}
			this.row_index.find('span').html(this.doc.idx);
		}

		this.row_display = $('<div class="row-data sortable-handle template-row">'+
			+'</div>').appendTo(this.row)
			.html(frappe.render(this.grid.template, {
				doc: this.doc ? frappe.get_format_helper(this.doc) : null,
				frm: this.frm,
				row: this
			}));
	},
	render_row: function(refresh) {
		var me = this;
		this.set_row_index();

		// index (1, 2, 3 etc)
		if(!this.row_index) {
			var txt = (this.doc ? this.doc.idx : "&nbsp;");
			this.row_index = $(
				`<div class="row-index sortable-handle col col-xs-1">
					${this.row_check_html}
				<span>${txt}</span></div>`)
				.appendTo(this.row)
				.on('click', function(e) {
					if(!$(e.target).hasClass('grid-row-check')) {
						me.toggle_view();
					}
				});
		} else {
			this.row_index.find('span').html(txt);
		}

		this.setup_columns();
		this.add_open_form_button();
		this.refresh_check();

		if(this.frm && this.doc) {
			$(this.frm.wrapper).trigger("grid-row-render", [this]);
		}
	},

	make_editable: function() {
		this.row.toggleClass('editable-row', this.grid.is_editable());
	},

	is_too_small: function() {
		return this.row.width() ? this.row.width() < 300 : false;
	},

	add_open_form_button: function() {
		var me = this;
		if(this.doc && !this.grid.df.in_place_edit) {
			// remove row
			if(!this.open_form_button) {
				this.open_form_button = $('<a class="close btn-open-row">\
					<span class="octicon octicon-triangle-down"></span></a>')
					.appendTo($('<div class="col col-xs-1 sortable-handle"></div>').appendTo(this.row))
					.on('click', function() { me.toggle_view(); return false; });

				if(this.is_too_small()) {
					// narrow
					this.open_form_button.css({'margin-right': '-2px'});
				}
			}
		}
	},

	setup_columns: function() {
		var me = this;
		this.focus_set = false;
		this.grid.setup_visible_columns();

		for(var ci in this.grid.visible_columns) {
			var df = this.grid.visible_columns[ci][0],
				colsize = this.grid.visible_columns[ci][1],
				txt = this.doc ?
					frappe.format(this.doc[df.fieldname], df, null, this.doc) :
					__(df.label);

			if(this.doc && df.fieldtype === "Select") {
				txt = __(txt);
			}

			if(!this.columns[df.fieldname]) {
				var column = this.make_column(df, colsize, txt, ci);
			} else {
				var column = this.columns[df.fieldname];
				this.refresh_field(df.fieldname, txt);
			}

			// background color for cellz
			if(this.doc) {
				if(df.reqd && !txt) {
					column.addClass('error');
				}
				if (df.reqd || df.bold) {
					column.addClass('bold');
				}
			}
		}
	},

	make_column: function(df, colsize, txt, ci) {
		var	me = this;
		var add_class = ((["Text", "Small Text"].indexOf(df.fieldtype)!==-1) ?
			" grid-overflow-no-ellipsis" : "");
		add_class += (["Int", "Currency", "Float", "Percent"].indexOf(df.fieldtype)!==-1) ?
			" text-right": "";
		add_class += (["Check"].indexOf(df.fieldtype)!==-1) ?
			" text-center": "";

		var $col = $('<div class="col grid-static-col col-xs-'+colsize+' '+add_class+'"></div>')
			.attr("data-fieldname", df.fieldname)
			.attr("data-fieldtype", df.fieldtype)
			.data("df", df)
			.appendTo(this.row)
			.on('click', function() {
				if(frappe.ui.form.editable_row===me) {
					return;
				}
				var out = me.toggle_editable_row();
				var col = this;
				setTimeout(function() {
					$(col).find('input[type="Text"]:first').focus();
				}, 500);
				return out;
			});

		$col.field_area = $('<div class="field-area"></div>').appendTo($col).toggle(false);
		$col.static_area = $('<div class="static-area ellipsis"></div>').appendTo($col).html(txt);
		$col.df = df;
		$col.column_index = ci;

		this.columns[df.fieldname] = $col;
		this.columns_list.push($col);

		return $col;
	},

	activate: function() {
		this.toggle_editable_row(true);
		return this;
	},

	toggle_editable_row: function(show) {
		var me = this;
		// show static for field based on
		// whether grid is editable
		if(this.grid.allow_on_grid_editing() && this.grid.is_editable() && this.doc && show !== false) {

			// disable other editable row
			if(frappe.ui.form.editable_row
				&& frappe.ui.form.editable_row !== this) {
				frappe.ui.form.editable_row.toggle_editable_row(false);
			}

			this.row.toggleClass('editable-row', true);

			// setup controls
			this.columns_list.forEach(function(column) {
				me.make_control(column);
				column.static_area.toggle(false);
				column.field_area.toggle(true);
			});

			frappe.ui.form.editable_row = this;
			return false;
		} else {
			this.row.toggleClass('editable-row', false);
			this.columns_list.forEach((column, index) => {

				if(!this.frm) {
					let df = this.grid.visible_columns[index][0];

					let txt = this.doc ?
						frappe.format(this.doc[df.fieldname], df, null, this.doc) :
						__(df.label);

					this.refresh_field(df.fieldname, txt);
				}

				if (!column.df.hidden) {
					column.static_area.toggle(true);
				}

				column.field_area && column.field_area.toggle(false);
			});
			frappe.ui.form.editable_row = null;
		}
	},

	make_control: function(column) {
		if(column.field) return;

		var me = this,
			parent = column.field_area,
			df = column.df;

		// no text editor in grid
		if (df.fieldtype=='Text Editor') {
			df.fieldtype = 'Text';
		}

		var field = frappe.ui.form.make_control({
			df: df,
			parent: parent,
			only_input: true,
			with_link_btn: true,
			doc: this.doc,
			doctype: this.doc.doctype,
			docname: this.doc.name,
			frm: this.grid.frm,
			grid: this.grid,
			grid_row: this,
			value: this.doc[df.fieldname]
		});

		// sync get_query
		field.get_query = this.grid.get_field(df.fieldname).get_query;
		field.refresh();
		if(field.$input) {
			field.$input
				.addClass('input-sm')
				.attr('data-col-idx', column.column_index)
				.attr('placeholder', __(df.label));
			// flag list input
			if (this.columns_list && this.columns_list.slice(-1)[0]===column) {
				field.$input.attr('data-last-input', 1);
			}
		}

		this.set_arrow_keys(field);
		column.field = field;
		this.on_grid_fields_dict[df.fieldname] = field;
		this.on_grid_fields.push(field);

	},

	set_arrow_keys: function(field) {
		var me = this;
		if(field.$input) {
			field.$input.on('keydown', function(e) {
				var { TAB, UP_ARROW, DOWN_ARROW } = frappe.ui.keyCode;
				if(!in_list([TAB, UP_ARROW, DOWN_ARROW], e.which)) {
					return;
				}

				var values = me.grid.get_data();
				var fieldname = $(this).attr('data-fieldname');
				var fieldtype = $(this).attr('data-fieldtype');

				var move_up_down = function(base) {
					if(in_list(['Text', 'Small Text'], fieldtype)) {
						return;
					}

					base.toggle_editable_row();
					setTimeout(function() {
						var input = base.columns[fieldname].field.$input;
						if(input) {
							input.focus();
						}
					}, 400)

				}

				// TAB
				if(e.which==TAB && !e.shiftKey) {
					// last column
					if($(this).attr('data-last-input') ||
						me.grid.wrapper.find('.grid-row :input:enabled:last').get(0)===this) {
						setTimeout(function() {
							if(me.doc.idx === values.length) {
								// last row
								me.grid.add_new_row(null, null, true);
								me.grid.grid_rows[me.grid.grid_rows.length - 1].toggle_editable_row();
								me.grid.set_focus_on_row();
							} else {
								me.grid.grid_rows[me.doc.idx].toggle_editable_row();
								me.grid.set_focus_on_row(me.doc.idx+1);
							}
						}, 500);
					}
				} else if(e.which==UP_ARROW) {
					if(me.doc.idx > 1) {
						var prev = me.grid.grid_rows[me.doc.idx-2];
						move_up_down(prev);
					}
				} else if(e.which==DOWN_ARROW) {
					if(me.doc.idx < values.length) {
						var next = me.grid.grid_rows[me.doc.idx];
						move_up_down(next);
					}
				}

			});
		}
	},

	get_open_form: function() {
		return frappe.ui.form.get_open_grid_form();
	},

	toggle_view: function(show, callback) {
		if(!this.doc) {
			return this;
		}

		if(this.frm) {
			// reload doc
			this.doc = locals[this.doc.doctype][this.doc.name];
		}

		// hide other
		var open_row = this.get_open_form();

		if (show===undefined) show = !!!open_row;

		// call blur
		document.activeElement && document.activeElement.blur();

		if(show && open_row) {
			if(open_row==this) {
				// already open, do nothing
				callback && callback();
				return;
			} else {
				// close other views
				open_row.toggle_view(false);
			}
		}

		if(show) {
			this.show_form();
		} else {
			this.hide_form();
		}
		callback && callback();

		return this;
	},
	show_form: function() {
		if(!this.grid_form) {
			this.grid_form = new frappe.ui.form.GridRowForm({
				row: this
			});
		}
		this.grid_form.render();
		this.row.toggle(false);
		// this.form_panel.toggle(true);
		frappe.dom.freeze("", "dark");
		cur_frm.cur_grid = this;
		this.wrapper.addClass("grid-row-open");
		if(!frappe.dom.is_element_in_viewport(this.wrapper)) {
			frappe.utils.scroll_to(this.wrapper, true, 15);
		}

		if(this.frm) {
			this.frm.script_manager.trigger(this.doc.parentfield + "_on_form_rendered");
			this.frm.script_manager.trigger("form_render", this.doc.doctype, this.doc.name);
		}
	},
	hide_form: function() {
		frappe.dom.unfreeze();
		this.row.toggle(true);
		this.refresh();
		cur_frm.cur_grid = null;
		this.wrapper.removeClass("grid-row-open");
	},
	open_prev: function() {
		if(this.grid.grid_rows[this.doc.idx-2]) {
			this.grid.grid_rows[this.doc.idx-2].toggle_view(true);
		}
	},
	open_next: function() {
		if(this.grid.grid_rows[this.doc.idx]) {
			this.grid.grid_rows[this.doc.idx].toggle_view(true);
		} else {
			this.grid.add_new_row(null, null, true);
		}
	},
	refresh_field: function(fieldname, txt) {
		var df = this.grid.get_docfield(fieldname) || undefined;

		// format values if no frm
		if(!df) {
			df = this.grid.visible_columns.find((col) => {
				return col[0].fieldname === fieldname;
			});
			if(df && this.doc) {
				var txt = frappe.format(this.doc[fieldname], df[0],
					null, this.doc);
			}
		}

		if(txt===undefined && this.frm) {
			var txt = frappe.format(this.doc[fieldname], df,
				null, this.frm.doc);
		}

		// reset static value
		var column = this.columns[fieldname];
		if(column) {
			column.static_area.html(txt || "");
			if(df && df.reqd) {
				column.toggleClass('error', !!(txt===null || txt===''));
			}
		}

		// reset field value
		var field = this.on_grid_fields_dict[fieldname];
		if(field) {
			field.docname = this.doc.name;
			field.refresh();
		}

		// in form
		if(this.grid_form) {
			this.grid_form.refresh_field(fieldname);
		}
	},
	get_field: function(fieldname) {
		let field = this.on_grid_fields_dict[fieldname];
		if (field) {
			return field;
		} else if(this.grid_form) {
			return this.grid_form.fields_dict[fieldname];
		} else {
			throw `fieldname ${fieldname} not found`;
		}
	},

	get_visible_columns: function(blacklist) {
		var me = this;
		var visible_columns = $.map(this.docfields, function(df) {
			var visible = !df.hidden && df.in_list_view && me.grid.frm.get_perm(df.permlevel, "read")
				&& !in_list(frappe.model.layout_fields, df.fieldtype) && !in_list(blacklist, df.fieldname);

			return visible ? df : null;
		});
		return visible_columns;
	},
	set_field_property: function(fieldname, property, value) {
		// set a field property for open form / grid form
		var me = this;

		var set_property = function(field) {
			if(!field) return;
			field.df[property] = value;
			field.refresh();
		}

		// set property in grid form
		if(this.grid_form) {
			set_property(this.grid_form.fields_dict[fieldname]);
			this.grid_form.layout && this.grid_form.layout.refresh_sections();
		}

		// set property in on grid fields
		set_property(this.on_grid_fields_dict[fieldname]);
	},
	toggle_reqd: function(fieldname, reqd) {
		this.set_field_property(fieldname, 'reqd', reqd ? 1 : 0);
	},
	toggle_display: function(fieldname, show) {
		this.set_field_property(fieldname, 'hidden', show ? 0 : 1);
	},
	toggle_editable: function(fieldname, editable) {
		this.set_field_property(fieldname, 'read_only', editable ? 0 : 1);
	}
});
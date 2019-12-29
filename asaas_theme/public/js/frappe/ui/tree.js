// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

// for license information please see license.txt

// constructor: parent, label, method, args
frappe.ui.Tree = Class.extend({
	init: function(args) {
		$.extend(this, args);
		this.nodes = {};
		this.wrapper = $('<div class="tree">').appendTo(this.parent);
		this.rootnode = new frappe.ui.TreeNode({
			tree: this,
			parent: this.wrapper,
			label: this.label,
			parent_label: null,
			expandable: true,
			is_root: true,
			data: {
				value: this.label,
				parent: this.label,
				expandable: true
			}
		});
		this.rootnode.toggle();
	},
	refresh: function() {
		this.selected_node.reload_parent();
	},
	get_selected_node: function() {
		return this.selected_node;
	},
	toggle: function() {
		this.get_selected_node().toggle();
	}
});

frappe.ui.TreeNode = Class.extend({
	init: function(args) {
		$.extend(this, args);
		this.loaded = false;
		this.expanded = false;
		this.tree.nodes[this.label] = this;
		if(this.parent_label)
			this.parent_node = this.tree.nodes[this.parent_label];

		this.make();
		this.setup_drag_drop();

		if(this.tree.onrender) {
			this.tree.onrender(this);
		}
	},
	make: function() {
		var me = this;
		this.tree_link = $('<span class="tree-link">')
			.click(function(event) {
				me.tree.selected_node = me;
				me.tree.wrapper.find(".tree-link.active").removeClass("active");
				me.tree_link.addClass("active");
				if(me.tree.toolbar) {
					me.show_toolbar();
				}
				if(me.tree.click) {
					me.tree.click(this);
				}
				if(me.tree.onclick) {
					me.tree.onclick(me);
				}
			})
			.data('label', this.label)
			.data('node', this)
			.appendTo(this.parent);

		this.$ul = $('<ul class="tree-children">')
			.toggle(false).appendTo(this.parent);

		this.make_icon();

	},
	make_icon: function() {
		// label with icon
		var me= this;
		var icon_html = '<i class="octicon octicon-primitive-dot text-extra-muted"></i>';
		if(this.expandable) {
			icon_html = '<i class="fa fa-fw fa-folder text-muted" style="font-size: 14px;"></i>';
		}
		$(icon_html + ' <a class="tree-label grey h6">' + this.get_label() + "</a>").
			appendTo(this.tree_link);

		this.tree_link.find('i').click(function() {
			setTimeout(function() { me.toolbar.find(".btn-expand").click(); }, 100);
		});

		this.tree_link.find('a').click(function() {
			if(!me.expanded) setTimeout(function() { me.toolbar.find(".btn-expand").click(); }, 100);
		});
	},
	get_label: function() {
		if(this.tree.get_label) {
			return this.tree.get_label(this);
		}
		if (this.title && this.title != this.label) {
			return __(this.title) + ` <span class='text-muted'>(${this.label})</span>`;
		} else {
			return __(this.title || this.label);
		}
	},
	toggle: function(callback) {
		if(this.expandable && this.tree.method && !this.loaded) {
			this.load(callback)
		} else {
			this.toggle_node(callback);
		}
	},
	show_toolbar: function() {
		if(this.tree.cur_toolbar)
			$(this.tree.cur_toolbar).toggle(false);

		if(!this.toolbar)
			this.make_toolbar();

		this.tree.cur_toolbar = this.toolbar;
		this.toolbar.toggle(true);
	},
	make_toolbar: function() {
		var me = this;
		this.toolbar = $('<span class="tree-node-toolbar btn-group"></span>').insertAfter(this.tree_link);

		$.each(this.tree.toolbar, function(i, item) {
			if(item.toggle_btn) {
				item = {
					condition: function() { return me.expandable; },
					get_label: function() { return me.expanded ? __("Collapse") : __("Expand") },
					click:function(node, btn) {
						node.toggle(function() {
							$(btn).html(node.expanded ? __("Collapse") : __("Expand"));
						});
					},
					btnClass: "btn-expand hidden-xs"
				}
			}
			if(item.condition) {
				if(!item.condition(me)) return;
			}
			var label = item.get_label ? item.get_label() : item.label;
			var link = $("<button class='btn btn-default btn-xs'></button>")
				.html(label)
				.appendTo(me.toolbar)
				.click(function() { item.click(me, this); return false; });

			if(item.btnClass) link.addClass(item.btnClass);
		})

	},
	setup_drag_drop: function() {
		// experimental
		var me = this;
		if(this.tree.drop && this.parent_label) {
			this.$ul.droppable({
				hoverClass: "tree-hover",
				greedy: true,
				drop: function(event, ui) {
					event.preventDefault();
					var dragged_node = $(ui.draggable).find(".tree-link:first").data("node");
					var dropped_node = $(this).parent().find(".tree-link:first").data("node");
					me.tree.drop(dragged_node, dropped_node, $(ui.draggable), $(this));
					return false;
				}
			});
		}

	},
	addnode: function(data) {
		var $li = $('<li class="tree-node">');
		if(this.tree.drop) $li.draggable({revert:true});

		return new frappe.ui.TreeNode({
			tree: this.tree,
			parent: $li.appendTo(this.$ul),
			parent_label: this.label,
			label: data.value,
			title: data.title,
			expandable: data.expandable,
			data: data
		});
	},
	toggle_node: function(callback) {
		// expand children
		if(this.$ul) {
			if(this.$ul.children().length) {
				this.$ul.toggle(!this.expanded);
			}

			// open close icon
			this.tree_link.find('i').removeClass();
			if(!this.expanded) {
				this.tree_link.find('i').addClass('fa fa-fw fa-folder-open text-muted');
			} else {
				this.tree_link.find('i').addClass('fa fa-fw fa-folder text-muted');
			}
		}

		// select this link
		this.tree.wrapper.find('.selected')
			.removeClass('selected');
		this.tree_link.toggleClass('selected');
		this.expanded = !this.expanded;

		this.expanded ?
			this.parent.addClass('opened') :
			this.parent.removeClass('opened');
		if(callback) callback();
	},
	reload: function() {
		this.load();
	},
	reload_parent: function() {
		this.parent_node && this.parent_node.load_all();
	},
	load_all: function(callback) {
		var  me = this;
		let args = $.extend({}, this.tree.args);

		args.parent = this.data.value;
		args.tree_method = this.tree.method;
		args.is_root = this.is_root;

		return frappe.call({
			method: 'frappe.desk.treeview.get_all_nodes',
			args: args,
			callback: function(r) {
				$.each(r.message, function(i, d) {
					me.render_expand_node(me.tree.nodes[d.parent], d.data);
				});
				if(callback) { callback(); }
			}
		});
	},
	load: function(callback) {
		var node = this;
		var args = $.extend(this.tree.args || {}, {
			parent: this.data.value
		});

		args.is_root = this.is_root;

		return frappe.call({
			method: this.tree.method,
			args: args,
			callback: function(r) {
				node.render_expand_node(node, r.message, callback);
			}
		})
	},
	render_expand_node: function(node, data, callback) {
		node.$ul.empty();
		if (data) {
			$.each(data, function(i, v) {
				var child_node = node.addnode(v);
				child_node.tree_link
					.data('node-data', v)
					.data('node', child_node);
			});
		}

		node.expanded = false;
		node.toggle_node(callback);
		node.loaded = true;
	},
})

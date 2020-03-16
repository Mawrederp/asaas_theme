frappe.ui.toolbar.Toolbar = frappe.ui.toolbar.Toolbar.extend({
	init: function() {
		$('header').append(frappe.render_template("navbar", {
			avatar: frappe.avatar(frappe.session.user)
		}));
		$('.dropdown-toggle').dropdown();

		
		this.load_sidebar_modules();
		this.load_sidebar_userinfo();

		let awesome_bar = new frappe.search.AwesomeBar();
		awesome_bar.setup("#navbar-search");
		awesome_bar.setup("#modal-search");

		this.make();
	},
	load_sidebar_userinfo: function(){
		let user_info = $('#primary-sidebar .user-info');
		let profile_image = $('#primary-sidebar .profile-image');
		let frappe_user_info = frappe.user_info();
		let department = frappe.boot.user_department;
		profile_image.html(`<img src="${frappe.user.image()}">`);

		user_info.html('');
		if(frappe_user_info.fullname){
			user_info.append(`<h4 id="user-fullname">${__(frappe_user_info.fullname)}</h4>`)
		}
		if(department){
			user_info.append(`<h4 id="user-department">${__(department)}</h4>`)
		}

		profile_image.click(function(){
			frappe.prompt([
			{'fieldname': 'user_image', 'fieldtype': 'Attach Image', 'label': 'User Image', 'reqd': 1}  
		],
		function(values){
				frappe.msgprint("Changing user image...");
				frappe.db.set_value("User",frappe.session.user,"user_image",values.user_image).then(function(){
					profile_image.html(`<img src="${values.user_image}">`);
				});
		},
		'Upload New Image',
		'Upload'
		)
		
		})



	},
	load_sidebar_modules: function(){
		let sidebar = $('#primary-sidebar .sidebar-modules');
		sidebar.html('')
		let modules = frappe.get_desktop_icons();

		for (const module in modules) {
			if (modules.hasOwnProperty(module)) {
				const element = modules[module];
				console.log(element)
				sidebar.append(`<div class="sidebar-module">
				<a class="module-link" href="desk#${element.link}">
				<span>
					<i class="${element.icon}"></i>
				</span>
				<h5 class="module-title">
					${__(element.label)}</h5>
				</a>
			</div>`)
			}
		}
	},
	make: function() {
		this.setup_sidebar();
		this.setup_help();
		this.setup_progress_dialog();
		this.bind_events();

		$(document).trigger('toolbar_setup');
	},

	bind_events: function() {
		$(document).on("notification-update", function() {
			frappe.ui.notifications.update_notifications();
		});

		// clear all custom menus on page change
		$(document).on("page-change", function() {
			$("header .navbar .custom-menu").remove();
			if (frappe.breadcrumbs.current_page() == ""){
				frappe.breadcrumbs.all[frappe.breadcrumbs.current_page()] = "الأقسام الرئيسية";
				frappe.breadcrumbs.update();
				$(".page-title .title-text").empty();
				console.log("Hello")
			}
		});

		//focus search-modal on show in mobile view
		$('#search-modal').on('shown.bs.modal', function () {
			var search_modal = $(this);
			setTimeout(function() {
				search_modal.find('#modal-search').focus();
			}, 300);
		});
	},

	setup_sidebar: function () {
		var header = $('header');
		header.find(".toggle-sidebar-btn").on("click", function () {
			var layout_side_section = $('#primary-sidebar');
			layout_side_section.parent().toggleClass("col-md-2 col-sm-2");
			layout_side_section.parent().toggle();

			$('.page-head').toggleClass('full-width');
			$('header .container').toggleClass('full-width');
			$('.row.layout-main .layout-main-section-wrapper')
			$('header').parent().toggleClass('col-md-12 col-sm-12');
			$('header').parent().toggleClass('col-md-10 col-sm-10');




			// var overlay_sidebar = layout_side_section.find('.overlay-sidebar');

			// overlay_sidebar.addClass('opened');
			// overlay_sidebar.find('.reports-dropdown')
			// 	.removeClass('dropdown-menu')
			// 	.addClass('list-unstyled');
			// overlay_sidebar.find('.dropdown-toggle')
			// 	.addClass('text-muted').find('.caret')
			// 	.addClass('hidden-xs hidden-sm');

			// $('<div class="close-sidebar">').hide().appendTo(layout_side_section).fadeIn();

			// var scroll_container = $('html');
			// scroll_container.css("overflow-y", "hidden");

			// layout_side_section.find(".close-sidebar").on('click', close_sidebar);
			// layout_side_section.on("click", "a", close_sidebar);

			function close_sidebar(e) {
				scroll_container.css("overflow-y", "");

				layout_side_section.find("div.close-sidebar").fadeOut(function() {
					overlay_sidebar.removeClass('opened')
						.find('.dropdown-toggle')
						.removeClass('text-muted');
					overlay_sidebar.find('.reports-dropdown')
						.addClass('dropdown-menu');
				});
			}
		});
		header.find(".toggle-sidebar").on("click", function () {
			var layout_side_section = $('.layout-side-section');
			var overlay_sidebar = layout_side_section.find('.overlay-sidebar');

			overlay_sidebar.addClass('opened');
			overlay_sidebar.find('.reports-dropdown')
				.removeClass('dropdown-menu')
				.addClass('list-unstyled');
			overlay_sidebar.find('.dropdown-toggle')
				.addClass('text-muted').find('.caret')
				.addClass('hidden-xs hidden-sm');
			
			$('.list-tag-preview').parent().hide();

			$('<div class="close-sidebar">').hide().appendTo(layout_side_section).fadeIn();

			var scroll_container = $('html');
			scroll_container.css("overflow-y", "hidden");

			layout_side_section.find(".close-sidebar").on('click', close_sidebar);
			layout_side_section.on("click", "a", close_sidebar);

			function close_sidebar(e) {
				scroll_container.css("overflow-y", "");

				layout_side_section.find("div.close-sidebar").fadeOut(function() {
					overlay_sidebar.removeClass('opened')
						.find('.dropdown-toggle')
						.removeClass('text-muted');
					overlay_sidebar.find('.reports-dropdown')
						.addClass('dropdown-menu');
				});
			}
		});
	},

	setup_help: function () {
		frappe.provide('frappe.help');
		frappe.help.show_results = show_results;

		this.search = new frappe.search.SearchDialog();
		frappe.provide('frappe.searchdialog');
		frappe.searchdialog.search = this.search;

		$(".dropdown-help .dropdown-toggle").on("click", function () {
			$(".dropdown-help input").focus();
		});

		$(".dropdown-help .dropdown-menu").on("click", "input, button", function (e) {
			e.stopPropagation();
		});

		$("#input-help").on("keydown", function (e) {
			if(e.which == 13) {
				var keywords = $(this).val();
				// show_help_results(keywords);
				$(this).val("");
			}
		});

		$(document).on("page-change", function () {
			var $help_links = $(".dropdown-help #help-links");
			$help_links.html("");

			var route = frappe.get_route_str();
			var breadcrumbs = route.split("/");

			var links = [];
			for (var i = 0; i < breadcrumbs.length; i++) {
				var r = route.split("/", i + 1);
				var key = r.join("/");
				var help_links = frappe.help.help_links[key] || [];
				links = $.merge(links, help_links);
			}

			if(links.length === 0) {
				$help_links.next().hide();
			}
			else {
				$help_links.next().show();
			}

			for (var i = 0; i < links.length; i++) {
				var link = links[i];
				var url = link.url;
				$("<a>", {
					href: link.url,
					text: link.label,
					target: "_blank"
				}).appendTo($help_links);
			}

			$('.dropdown-help .dropdown-menu').on('click', 'a', show_results);
		});

		var $result_modal = frappe.get_modal("", "");
		$result_modal.addClass("help-modal");

		$(document).on("click", ".help-modal a", show_results);

		function show_results(e) {
			//edit links
			var href = e.target.href;
			if(href.indexOf('blob') > 0) {
				window.open(href, '_blank');
			}
			var converter = new Showdown.converter();
			var path = $(e.target).attr("data-path");
			if(path) {
				e.preventDefault();
			}
		}
	},

	setup_progress_dialog: function() {
		var me = this;
		frappe.call({
			method: "frappe.desk.user_progress.get_user_progress_slides",
			callback: function(r) {
				if(r.message) {
					let slides = r.message;
					if(slides.length && slides.map(s => parseInt(s.done)).includes(0)) {
						frappe.require("assets/frappe/js/frappe/ui/toolbar/user_progress_dialog.js", function() {
							me.progress_dialog = new frappe.setup.UserProgressDialog({
								slides: slides
							});
							$('.user-progress').removeClass('hide');
							$('.user-progress .dropdown-toggle').on('click', () => {
								me.progress_dialog.show();
							});

							if (frappe.boot.is_first_startup) {
								me.progress_dialog.show();
								frappe.call({
									method: "frappe.desk.page.setup_wizard.setup_wizard.reset_is_first_startup",
									args: {},
									callback: () => {}
								});
							}

						});
					}
				}
			},
			freeze: false
		});
	}
});
frappe.new_avatar = function(user, css_class, title) {
	if(user) {
		// desk
		var user_info = frappe.user_info(user);
	} else {
		// website
		user_info = {
			image: frappe.get_cookie("user_image"),
			fullname: frappe.get_cookie("full_name"),
			abbr: frappe.get_abbr(frappe.get_cookie("full_name")),
			color: frappe.get_palette(frappe.get_cookie("full_name"))
		}
	}

	if(!title) {
		title = user_info.fullname;
	}

	if(!css_class) {
		css_class = "avatar-small";
	}

	if(user_info.image) {

		var image = (window.cordova && user_info.image.indexOf('http')===-1) ?
			frappe.base_url + user_info.image : user_info.image;

		return repl(`<span class="avatar %(css_class)s" title="%(title)s">\
			<span class="avatar-frame" style="background-image: url('%(image)s')"\
			title="%(title)s"></span></span>`, {
				image: image,
				title: title,
				abbr: user_info.abbr,
				css_class: css_class
			});
	} else {
		var abbr = user_info.abbr;
		if(css_class==='avatar-small' || css_class=='avatar-xs') {
			abbr = abbr.substr(0, 1);
		}
		return repl('<span class="avatar %(css_class)s" title="%(title)s">\
			<div class="standard-image" style="background-color: %(color)s;">%(abbr)s</div></span>', {
				title: title,
				abbr: abbr,
				css_class: css_class,
				color: user_info.color
			})
	}
}
frappe.ui.toolbar.Toolbar = frappe.ui.toolbar.Toolbar.extend({
	init: function() {
		$('header').append(frappe.render_template("navbar", {
			avatar: frappe.new_avatar(frappe.session.user)
		}));
		$('.dropdown-toggle').dropdown();

		this.load_sidebar_modules();
		this.load_sidebar_userinfo();

		let awesome_bar = new frappe.search.AwesomeBar();
		awesome_bar.setup("#navbar-search");
		awesome_bar.setup("#modal-search");

		this.make();
	},
	load_sidebar_userinfo: function(){
		let user_info = $('#primary-sidebar .user-info');
		let profile_image = $('#primary-sidebar .profile-image');
		let frappe_user_info = frappe.user_info();
		let department = frappe.boot.user_department;
		profile_image.html(`<img src="${frappe.user.image()}">`);

		user_info.html('');
		if(frappe_user_info.fullname){
			user_info.append(`<h4 id="user-fullname">${__(frappe_user_info.fullname)}</h4>`)
		}
		if(department){
			user_info.append(`<h4 id="user-department">${__(department)}</h4>`)
		}

		profile_image.click(function(){
		var dialog = frappe.prompt([
			{'fieldname': 'user_image', 'fieldtype': 'Attach Image', 'label': 'User Image', 'reqd': 1}  
		],
		function(values){
				frappe.msgprint("Changing user image...");
				console.log(values);
				frappe.db.set_value("User",frappe.session.user,"user_image",values.user_image).then(function(){
					profile_image.html(`<img src="${values.user_image}">`);
				});
		},
		'Change Profile Image',
		'Change Image'
		)		
		})


	},
	load_sidebar_modules: function(){
		let sidebar = $('#primary-sidebar .sidebar-modules');
		sidebar.html('')
		let modules = frappe.get_desktop_icons();

		for (const module in modules) {
			if (modules.hasOwnProperty(module)) {
				const element = modules[module];
				sidebar.append(`<div class="sidebar-module">
				<a class="module-link" href="desk#${element.link}">
				<div class="module-title">
					<span>
						<i class="${element.icon}"></i>
					</span>
					<h5>${__(element.label)}</h5></div>
				</a>
			</div>`)
			}
		}
	}
});

frappe.ui.Page = frappe.ui.Page.extend({
	init: function(opts) {
		$.extend(this, opts);

		this.set_document_title = true;
		this.buttons = {};
		this.fields_dict = {};
		this.views = {};

		this.make();
		frappe.ui.pages[frappe.get_route_str()] = this;
	},

	make: function() {
		this.wrapper = $(this.parent);
		this.add_main_section();
	},

	get_empty_state: function(title, message, primary_action) {
		let $empty_state = $(`<div class="page-card-container">
			<div class="page-card">
				<div class="page-card-head">
					<span class="indicator blue">
						${title}</span>
				</div>
				<p>${message}</p>
				<div>
					<button class="btn btn-primary btn-sm">${primary_action}</button>
				</div>
			</div>
		</div>`);

		return $empty_state;
	},

	load_lib: function (callback) {
		frappe.require(this.required_libs, callback);
	},

	add_main_section: function () {
		$(frappe.render_template("page", {})).appendTo(this.wrapper);
		if (this.single_column) {
			// nesting under col-sm-12 for consistency
			this.add_view("main", `<div class="row layout-main">\
					<div class="col-md-9 layout-main-section-wrapper">\
						<div class="layout-side-section"></div>\
						<div class="layout-main-section"></div>\
						<div class="layout-footer hide"></div>\
                    </div>\
					<div class="col-md-3 layout-other-section">\
					

					<div class="text-right page-actions">
					<!-- ID and icon buttons -->
					<span class="checked-items-status text-ellipsis text-muted small hide hidden-xs hidden-sm"
						style="margin-right: 20px;">## items selected</span>
					<h6 class="ellipsis sub-heading hide text-muted"></h6>
					<span class="page-icon-group hide hidden-xs hidden-sm"></span>
				
					<!-- buttons -->
					
					<button class="btn btn-secondary btn-default btn-sm hide"></button>
					<div class="btn-group actions-btn-group hide">
						<button type="button" class="btn btn-primary btn-sm dropdown-toggle" data-toggle="dropdown"
							aria-expanded="false">
							<span class="hidden-xs">
								{%= __("Actions") %} <span class="caret"></span>
							</span>
							<span class="visible-xs octicon octicon-check"></span>
						</button>
						<ul class="dropdown-menu" role="menu">
						</ul>
					</div>
					<button class="btn btn-primary btn-sm hide primary-action"></button>
					</div>
					<div class="btn-group menu-btn-group hide">
						<button type="button" class="btn btn-default btn-sm dropdown-toggle" data-toggle="dropdown"
							aria-expanded="false">
							<span class="hidden-xs">
								<span class="menu-btn-group-label">${__("Menu")}</span>
								<span class="caret"></span></span>
							<span class="visible-xs"><i class="octicon octicon-triangle-down"></i></span>
						</button>
						<ul class="dropdown-menu" role="menu">
						</ul>
					</div>
					
				</div>
					
				</div>`);
		} else {
			this.add_view("main", `<div class="row layout-main">\
			<div class="col-md-9 layout-main-section-wrapper">\
				<div class="layout-side-section"></div>\
					<div class="layout-main-section"></div>\
					<div class="layout-footer hide"></div>\
                </div>\
				<div class="col-md-3 layout-other-section">
				<div class="text-right page-actions">
    <!-- ID and icon buttons -->
    <span class="checked-items-status text-ellipsis text-muted small hide hidden-xs hidden-sm"
        style="margin-right: 20px;">## items selected</span>
    <h6 class="ellipsis sub-heading hide text-muted"></h6>
    <span class="page-icon-group hide hidden-xs hidden-sm"></span>

    <!-- buttons -->
    
    <button class="btn btn-secondary btn-default btn-sm hide"></button>
	<button class="btn btn-primary btn-sm hide primary-action"></button>
    <div class="btn-group actions-btn-group hide">
        <button type="button" class="btn btn-primary btn-sm dropdown-toggle" data-toggle="dropdown"
            aria-expanded="false">
            <span class="hidden-xs">
                {%= __("Actions") %} <span class="caret"></span>
            </span>
            <span class="visible-xs octicon octicon-check"></span>
        </button>
        <ul class="dropdown-menu" role="menu">
        </ul>
	</div>
	
	
</div>
<div class="btn-group menu-btn-group hide">
        <button type="button" class="btn btn-default btn-sm dropdown-toggle" data-toggle="dropdown"
            aria-expanded="false">
            <span class="hidden-xs">
                <span class="menu-btn-group-label">${__("Menu")}</span>
                <span class="caret"></span></span>
            <span class="visible-xs"><i class="octicon octicon-triangle-down"></i></span>
        </button>
        <ul class="dropdown-menu" role="menu">
        </ul>
    </div>
				
				</div>\
			</div>`);
		}

		this.setup_page();
	},

	setup_page: function() {
		this.$title_area = $('.page-head').find("h1");

		this.$sub_title_area = this.wrapper.find("h6");

		if(this.set_document_title!==undefined)
			this.set_document_title = this.set_document_title;

		if(this.title)
			this.set_title(this.title);

		if(this.icon)
			this.get_main_icon(this.icon);

		this.body = this.main = this.wrapper.find(".layout-main-section");
		this.sidebar = this.wrapper.find(".layout-side-section");
		this.footer = this.wrapper.find(".layout-footer");
		this.indicator = this.wrapper.find(".indicator");

		this.page_actions = this.wrapper.find(".page-actions");

		this.btn_primary = this.page_actions.find(".primary-action");
		this.btn_secondary = this.page_actions.find(".btn-secondary");
		this.actions_menu = this.wrapper.find(".layout-other-section");
		this.menu = this.actions_menu.find(".menu-btn-group .dropdown-menu");
		this.menu_btn_group = this.actions_menu.find(".menu-btn-group");

		this.actions = this.actions_menu.find(".actions-btn-group .dropdown-menu");
		this.actions_btn_group = this.actions_menu.find(".actions-btn-group");

		this.page_form = $('<div class="page-form row hide"></div>').prependTo(this.main);
		this.inner_toolbar = $('<div class="form-inner-toolbar"></div>').prependTo(this.main);
		this.icon_group = this.page_actions.find(".page-icon-group");

		if(this.make_page) {
			this.make_page();
		}
	},

	set_indicator: function(label, color) {
		this.clear_indicator().removeClass("hide").html(`<span class='hidden-xs'>${label}</span>`).addClass(color);
	},

	add_action_icon: function(icon, click) {
		return $('<a class="text-muted no-decoration"><i class="'+icon+'"></i></a>')
			.appendTo(this.icon_group.removeClass("hide"))
			.click(click);
	},

	clear_indicator: function() {
		return this.indicator.removeClass().addClass("indicator hide");
	},

	get_icon_label: function(icon, label) {
		return '<i class="visible-xs ' + icon + '"></i><span class="hidden-xs">' + label + '</span>'
	},

	set_action: function(btn, opts) {
		let me = this;
		if (opts.icon) {
			opts.label = this.get_icon_label(opts.icon, opts.label);
		}

		this.clear_action_of(btn);

		btn.removeClass("hide")
			.prop("disabled", false)
			.html(opts.label)
			.on("click", function() {
				let response = opts.click.apply(this);
				me.btn_disable_enable(btn, response);
			});

		if (opts.working_label) {
			btn.attr("data-working-label", opts.working_label);
		}
	},

	set_primary_action: function(label, click, icon, working_label) {
		this.set_action(this.btn_primary, {
			label: label,
			click: click,
			icon: icon,
			working_label: working_label
		});

		return this.btn_primary;
	},

	set_secondary_action: function(label, click, icon, working_label) {
		this.set_action(this.btn_secondary, {
			label: label,
			click: click,
			icon: icon,
			working_label: working_label
		});

		return this.btn_secondary;
	},

	clear_action_of: function(btn) {
		btn.addClass("hide").unbind("click").removeAttr("data-working-label");
	},

	clear_primary_action: function() {
		this.clear_action_of(this.btn_primary);
	},

	clear_secondary_action: function() {
		this.clear_action_of(this.btn_secondary);
	},

	clear_actions: function() {
		this.clear_primary_action();
		this.clear_secondary_action();
	},

	clear_icons: function() {
		this.icon_group.addClass("hide").empty();
	},

	//--- Menu --//

	add_menu_item: function(label, click, standard) {
		return this.add_dropdown_item(label, click, standard, this.menu);
	},

	clear_menu: function() {
		this.clear_btn_group(this.menu);
	},

	show_menu: function() {
		this.menu_btn_group.removeClass("hide");
	},

	hide_menu: function() {
		this.menu_btn_group.addClass("hide");
	},

	show_icon_group: function() {
		this.icon_group.removeClass("hide");
	},

	hide_icon_group: function() {
		this.icon_group.addClass("hide");
	},

	//--- Actions (workflow) --//

	add_action_item: function(label, click, standard) {
		return this.add_dropdown_item(label, click, standard, this.actions);
	},

	clear_actions_menu: function() {
		this.clear_btn_group(this.actions);
	},

	//-- Generic --//

	/*
	* Add label to given drop down menu. If label, is already contained in the drop
	* down menu, it will be ignored.
	* @param {string} label - Text for the drop down menu
	* @param {function} click - function to be called when `label` is clicked
	* @param {Boolean} standard
	* @param {object} parent - DOM object representing the parent of the drop down item lists
	*/
	add_dropdown_item: function(label, click, standard, parent) {
		let item_selector = 'li > a.grey-link';

		parent.parent().removeClass("hide");
		let item_class = ["orange","green","yellow","grey"];
		let item_id = parent.find('li a.grey-link:not(.visible-xs)').length;
		
		var $li = $('<li><a class="grey-link">'+ label +'</a><li>'),
			$link = $li.find("a").on("click", click);
		
		$li.addClass(item_class[item_id % 4]+"-menu-item")

		if (this.is_in_group_button_dropdown(parent, item_selector, label)) return;

		if(standard===true) {
			$li.appendTo(parent);
		} else {
			this.divider = parent.find(".divider");
			if(!this.divider.length) {
				this.divider = $('<li class="divider user-action"></li>').prependTo(parent);
			}
			$li.addClass("user-action").insertBefore(this.divider);
		}

		return $link;
	},

	/*
	* Check if there already exists a button with a specified label in a specified button group
	* @param {object} parent - This should be the `ul` of the button group.
	* @param {string} selector - CSS Selector of the button to be searched for. By default, it is `li`.
	* @param {string} label - Label of the button
	*/
	is_in_group_button_dropdown: function(parent, selector, label){
		if (!selector) selector = 'li';

		if (!label || !parent) return false;

		const result = $(parent).find(`${selector}:contains('${label}')`)
			.filter(function() {
				return $(this).text() === label;
			});
		return result.length > 0;
	},

	clear_btn_group: function(parent) {
		parent.empty();
		parent.parent().addClass("hide");
	},

	add_divider: function() {
		return $('<li class="divider"></li>').appendTo(this.menu);
	},

	get_or_add_inner_group_button: function(label) {
		var $group = this.inner_toolbar.find('.btn-group[data-label="'+label+'"]');
		if(!$group.length) {
			$group = $('<div class="btn-group" data-label="'+label+'" style="margin-left: 10px;">\
				<button type="button" class="btn btn-default dropdown-toggle btn-xs" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">\
				'+label+' <span class="caret"></span></button>\
				<ul class="dropdown-menu" style="margin-top: -8px;"></ul></div>').appendTo(this.inner_toolbar);
		}
		return $group;
	},

	get_inner_group_button: function(label) {
		return this.inner_toolbar.find('.btn-group[data-label="'+label+'"]');
	},

	set_inner_btn_group_as_primary: function(label) {
		this.get_or_add_inner_group_button(label).find("button").removeClass("btn-default").addClass("btn-primary");
	},

	btn_disable_enable: function(btn, response) {
		if (response && response.then) {
			btn.prop('disabled', true);
			response.then(() => {
				btn.prop('disabled', false);
			})
		} else if (response && response.always) {
			btn.prop('disabled', true);
			response.always(() => {
				btn.prop('disabled', false);
			});
		}
	},

	/*
	* Add button to button group. If there exists another button with the same label,
	* `add_inner_button` will not add the new button to the button group even if the callback
	* function is different.
	*
	* @param {string} label - Label of the button to be added to the group
	* @param {object} action - function to be called when button is clicked
	* @param {string} group - Label of the group button
	*/
	add_inner_button: function(label, action, group) {
		var me = this;
		let _action = function() {
			let btn = $(this);
			let response = action();
			me.btn_disable_enable(btn, response);
		};
		
		let item_class = ["green","orange","grey","yellow"];
		let item_id = me.inner_toolbar.children().length;

		if(group) {
			var $group = this.get_or_add_inner_group_button(group);
			$(this.inner_toolbar).removeClass("hide");
			$group.find('button').addClass(item_class[$group.index() % 4]);


			if (!this.is_in_group_button_dropdown($group.find(".dropdown-menu"), 'li', label)) {
				return $('<li><a>'+label+'</a></li>')
					.on('click', _action)
					.appendTo($group.find(".dropdown-menu"));
			}

		} else {
			return $(`<button class="btn btn-default btn-xs ${item_class[item_id % 4]}" style="margin-left: 10px;">${__(label)}</btn>`)
				.on("click", _action)
				.appendTo(this.inner_toolbar.removeClass("hide"));
		}
	},

	remove_inner_button: function(label, group) {
		if (typeof label === 'string') {
			label = [label];
		}
		// translate
		label = label.map(l => __(l));

		if (group) {
			var $group = this.get_inner_group_button(__(group));
			if($group.length) {
				$group.find('.dropdown-menu li a')
					.filter((i, btn) => label.includes($(btn).text()))
					.remove();
			}
			if ($group.find('.dropdown-menu li a').length === 0) $group.remove();
		} else {

			this.inner_toolbar.find('button')
				.filter((i, btn) =>  label.includes($(btn).text()))
				.remove();
		}
	},

	clear_inner_toolbar: function() {
		this.inner_toolbar.empty().addClass("hide");
	},

	//-- Sidebar --//

	add_sidebar_item: function(label, action, insert_after, prepend) {
		var parent = this.sidebar.find(".sidebar-menu.standard-actions");
		var li = $('<li>');
		var link = $('<a>').html(label).on("click", action).appendTo(li);

		if(insert_after) {
			li.insertAfter(parent.find(insert_after));
		} else {
			if(prepend) {
				li.prependTo(parent);
			} else {
				li.appendTo(parent);
			}
		}
		return link;
	},

	//---//

	clear_user_actions: function() {
		this.menu.find(".user-action").remove();
	},

	// page::title
	get_title_area: function() {
		return this.$title_area;
	},

	set_title: function(txt, icon) {
		if(!txt) txt = "";

		// strip html
		txt = strip_html(txt);
		this.title = txt;

		frappe.utils.set_title(txt);
		if(icon) {
			txt = '<span class="'+ icon +' text-muted" style="font-size: inherit;"></span> ' + txt;
		}
		this.$title_area.find(".title-text").html(txt);
	},

	set_title_sub: function(txt) {
		// strip icon
		this.$sub_title_area.html(txt).toggleClass("hide", !!!txt);
	},

	get_main_icon: function(icon) {
		return this.$title_area.find(".title-icon")
			.html('<i class="'+icon+' fa-fw"></i> ')
			.toggle(true);
	},

	add_help_button: function(txt) {
		//
	},

	add_button: function(label, click, icon, is_title) {
		//
	},

	add_dropdown_button: function(parent, label, click, icon) {
		frappe.ui.toolbar.add_dropdown_button(parent, label, click, icon);
	},

	// page::form
	add_label: function(label) {
		this.show_form();
		return $("<label class='col-md-1 page-only-label'>"+label+" </label>")
			.appendTo(this.page_form);
	},
	add_select: function(label, options) {
		var field = this.add_field({label:label, fieldtype:"Select"});
		return field.$wrapper.find("select").empty().add_options(options);
	},
	add_data: function(label) {
		var field = this.add_field({label: label, fieldtype: "Data"});
		return field.$wrapper.find("input").attr("placeholder", label);
	},
	add_date: function(label, date) {
		var field = this.add_field({label: label, fieldtype: "Date", "default": date});
		return field.$wrapper.find("input").attr("placeholder", label);
	},
	add_check: function(label) {
		return $("<div class='checkbox'><label><input type='checkbox'>" + label + "</label></div>")
			.appendTo(this.page_form)
			.find("input");
	},
	add_break: function() {
		// add further fields in the next line
		this.page_form.append('<div class="clearfix invisible-xs"></div>');
	},
	add_field: function(df) {
		this.show_form();
		var f = frappe.ui.form.make_control({
			df: df,
			parent: this.page_form,
			only_input: df.fieldtype=="Check" ? false : true,
		})
		f.refresh();
		$(f.wrapper)
			.addClass('col-md-2')
			.attr("title", __(df.label)).tooltip();

		// html fields in toolbar are only for display
		if (df.fieldtype=='HTML') {
			return;
		}

		// hidden fields dont have $input
		if (!f.$input) f.make_input();

		f.$input.addClass("input-sm").attr("placeholder", __(df.label));

		if(df.fieldtype==="Check") {
			$(f.wrapper).find(":first-child")
				.removeClass("col-md-offset-4 col-md-8");
		}

		if(df.fieldtype=="Button") {
			$(f.wrapper).find(".page-control-label").html("&nbsp;")
			f.$input.addClass("btn-sm").css({"width": "100%", "margin-top": "-1px"});
		}

		if(df["default"])
			f.set_input(df["default"])
		this.fields_dict[df.fieldname || df.label] = f;
		return f;
	},
	show_form: function() {
		this.page_form.removeClass("hide");
	},
	get_form_values: function() {
		var values = {};
		this.page_form.fields_dict.forEach(function(field, key) {
			values[key] = field.get_value();
		});
		return values;
	},
	add_view: function(name, html) {
		let element = html;
		if(typeof(html) === "string") {
			element = $(html);
		}
		this.views[name] = element.appendTo($(this.wrapper).find(".page-content"));
		if(!this.current_view) {
			this.current_view = this.views[name];
		} else {
			this.views[name].toggle(false);
		}
		return this.views[name];
	},
	set_view: function(name) {
		if(this.current_view_name===name)
			return;
		this.current_view && this.current_view.toggle(false);
		this.current_view = this.views[name];

		this.previous_view_name = this.current_view_name;
		this.current_view_name = name;

		this.views[name].toggle(true);

		this.wrapper.trigger('view-change');
	},
});


frappe.desktop.render = function() {
		var me = this;
		frappe.utils.set_title(__("Desktop"));
		console.log("hello")

		var template = frappe.list_desktop ? "desktop_list_view" : "desktop_icon_grid";

		var all_icons = frappe.get_desktop_icons();
		var explore_icon = {
			module_name: 'Explore',
			label: 'Explore',
			_label: __('Explore'),
			_id: 'Explore',
			_doctype: '',
			icon: 'octicon octicon-telescope',
			color: '#7578f6',
			link: 'modules'
		};
		explore_icon.app_icon = frappe.ui.app_icon.get_html(explore_icon);
		all_icons.push(explore_icon);

		frappe.desktop.wrapper.html(frappe.render_template(template, {
			// all visible icons
			desktop_items: all_icons,
		}));

		frappe.desktop.setup_module_click();

		// notifications
		frappe.desktop.show_pending_notifications();
		$(document).on("notification-update", function() {
			me.show_pending_notifications();
		});

		$(document).trigger("desktop-render");

	}

frappe.ui.toolbar.Toolbar = frappe.ui.toolbar.Toolbar.extend({
	init: function() {
		$('header').append(frappe.render_template("navbar", {
			avatar: frappe.avatar(frappe.session.user)
		}));
		$('.dropdown-toggle').dropdown();

		console.log("new log")
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
		profile_image.html(frappe.avatar());

		user_info.html('');
		if(frappe_user_info.fullname){
			user_info.append(`<h4 id="user-fullname">${__(frappe_user_info.fullname)}</h4>`)
		}
		if(department){
			user_info.append(`<h4 id="user-department">${__(department)}</h4>`)
		}



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
				<h5 class="module-title">
					<span>
						<i class="${element.icon}"></i>
					</span>
					${__(element.label)}</h5>
				</a>
			</div>`)
			}
		}
	}
});

frappe.ui.Page = frappe.ui.Page.extend({
	add_main_section: function () {
		$(frappe.render_template("page", {})).appendTo(this.wrapper);
		if (this.single_column) {
			// nesting under col-sm-12 for consistency
			this.add_view("main", `<div class="row layout-main">\
					<div class="col-md-2 layout-side-section"></div>\
					<div class="col-md-8 layout-main-section-wrapper">\
						<div class="layout-main-section"></div>\
						<div class="layout-footer hide"></div>\
                    </div>\
					<div class="col-md-2 layout-other-section">\
					

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
				</div>
					
				</div>`);
		} else {
			this.add_view("main", `<div class="row layout-main">\
				<div class="col-md-2 layout-side-section"></div>\
				<div class="col-md-8 layout-main-section-wrapper">\
					<div class="layout-main-section"></div>\
					<div class="layout-footer hide"></div>\
                </div>\
				<div class="col-md-2 layout-other-section">
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
				
				</div>\
			</div>`);
		}

		this.setup_page();
	}
})
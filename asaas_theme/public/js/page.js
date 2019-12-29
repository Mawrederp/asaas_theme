frappe.ui.Page = frappe.ui.Page.extend({
	add_main_section: function () {
		$(frappe.render_template("page", {})).appendTo(this.wrapper);
		if (this.single_column) {
			// nesting under col-sm-12 for consistency
			this.add_view("main", `<div class="row layout-main">\
					<div class="col-md-10 layout-main-section-wrapper">\
						<div class="layout-main-section"></div>\
						<div class="layout-footer hide"></div>\
                    </div>\
					<div class="col-md-2 layout-other-section"></div>\
					

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
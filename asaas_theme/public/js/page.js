frappe.ui.Page = frappe.ui.Page.extend({
    add_main_section: function() {
        $(frappe.render_template("page", {})).appendTo(this.wrapper);
		if(this.single_column) {
			// nesting under col-sm-12 for consistency
			this.add_view("main", '<div class="row layout-main">\
					<div class="col-md-10 layout-main-section-wrapper">\
						<div class="layout-main-section"></div>\
						<div class="layout-footer hide"></div>\
                    </div>\
                    <div class="col-md-2 layout-other-section"></div>\
				</div>');
		} else {
			this.add_view("main", '<div class="row layout-main">\
				<div class="col-md-2 layout-side-section"></div>\
				<div class="col-md-8 layout-main-section-wrapper">\
					<div class="layout-main-section"></div>\
					<div class="layout-footer hide"></div>\
                </div>\
                <div class="col-md-2 layout-other-section"></div>\
			</div>');
		}

		this.setup_page();
    }
})
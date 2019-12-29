// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

frappe.ui.Tags = class {
	constructor({
		parent, placeholder, tagsList,
		onTagAdd,
		onTagRemove,
		onTagClick,
		onChange
	}) {
		this.tagsList = tagsList || [];
		this.onTagAdd = onTagAdd;
		this.onTagRemove = onTagRemove;
		this.onTagClick = onTagClick;
		this.onChange = onChange;

		this.setup(parent, placeholder);
	}

	setup(parent, placeholder) {
		this.$wrapper = $(`<div class="tags-wrapper"></div>`).appendTo(parent);
		this.$ul = $(`<ul class="tags-list"></ul>`).appendTo(this.$wrapper);
		this.$input = $(`<input class="tags-input"></input>`);

		this.$inputWrapper = this.getListElement(this.$input);
		this.$placeholder = this.getListElement($(`<span class="tags-placeholder text-muted">${placeholder}</span>`));
		this.$inputWrapper.appendTo(this.$ul);
		this.$placeholder.appendTo(this.$ul);

		this.deactivate();
		this.bind();
		this.boot();
	}

	bind() {
		this.$input.keypress((e) => {
			if(e.which == 13 || e.keyCode == 13) {
				this.addTag(this.$input.val());
				this.$input.val('');
			}
		});

		this.$input.on('blur', () => {
			this.deactivate();
		});

		this.$placeholder.on('click', () => {
			this.activate();
		});
	}

	boot() {
		this.addTags(this.tagsList);
	}

	activate() {
		this.$placeholder.hide();
		this.$inputWrapper.show();
		this.$input.focus();
	}

	deactivate() {
		this.$inputWrapper.hide();
		this.$placeholder.show();
	}

	refresh() {
		this.deactivate();
		this.activate();
	}

	addTag(label) {
		if(label && !this.tagsList.includes(label)) {
			let $tag = this.getTag(label);
			this.getListElement($tag).insertBefore(this.$inputWrapper);
			this.tagsList.push(label);
			this.onTagAdd && this.onTagAdd(label);

			this.refresh();
		}
	}

	removeTag(label) {
		if(this.tagsList.includes(label)) {
			let $tag = this.$ul.find(`.frappe-tag[data-tag-label="${label}"]`);
			$tag.remove();
			this.tagsList = this.tagsList.filter(d => d !== label);
			this.onTagRemove && this.onTagRemove(label);
		}
	}

	addTags(labels) {
		labels.map(this.addTag.bind(this));
	}

	clearTags() {
		this.$ul.find('.frappe-tag').remove();
		this.tagsList = [];
	}

	getListElement($element, className) {
		let $li = $(`<li class="tags-list-item ${className}"></li>`);
		$element.appendTo($li);
		return $li;
	}

	getTag(label) {
		let $tag = $(`<div class="frappe-tag btn-group" data-tag-label="${label}">
		<button class="btn btn-default btn-xs toggle-tag"
			title="${ __("toggle Tag") }"
			data-tag-label="${label}">${label}
		</button>
		<button class="btn btn-default btn-xs remove-tag"
			title="${ __("Remove Tag") }"
			data-tag-label="${label}">
			<i class="fa fa-remove text-muted"></i>
		</button></div>`);

		let $removeTag = $tag.find(".remove-tag");

		$removeTag.on("click", () => {
			this.removeTag($removeTag.attr('data-tag-label'));
		});

		if(this.onTagClick) {
			let $toggle_tag = $tag.find(".toggle-tag");
			$toggle_tag.on("click", () => {
				this.onTagClick($toggle_tag.attr('data-tag-label'));
			});
		}

		return $tag;
	}
}

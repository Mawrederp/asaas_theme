# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals
import frappe, os

from frappe.website.utils import can_cache, delete_page_cache, extract_title
from frappe.model.document import get_controller
from six import text_type

def resolve_route(path):
	"""Returns the page route object based on searching in pages and generators.
	The `www` folder is also a part of generator **Web Page**.

	The only exceptions are `/about` and `/contact` these will be searched in Web Pages
	first before checking the standard pages."""
	if path not in ("about", "contact"):
		context = get_page_info_from_template(path)
		if context:
			return context
		return get_page_context_from_doctype(path)
	else:
		context = get_page_context_from_doctype(path)
		if context:
			return context
		return get_page_info_from_template(path)

def get_page_context(path):
	page_context = None
	if can_cache():
		page_context_cache = frappe.cache().hget("page_context", path) or {}
		page_context = page_context_cache.get(frappe.local.lang, None)

	if not page_context:
		page_context = make_page_context(path)
		if can_cache(page_context.no_cache):
			page_context_cache[frappe.local.lang] = page_context
			frappe.cache().hset("page_context", path, page_context_cache)

	return page_context

def make_page_context(path):
	context = resolve_route(path)
	if not context:
		raise frappe.DoesNotExistError

	context.doctype = context.ref_doctype

	if context.page_title:
		context.title = context.page_title

	context.pathname = frappe.local.path

	return context

def get_page_info_from_template(path):
	'''Return page_info from path'''
	for app in frappe.get_installed_apps(frappe_last=True):
		app_path = frappe.get_app_path(app)

		folders = get_start_folders()

		for start in folders:
			search_path = os.path.join(app_path, start, path)
			options = (search_path, search_path + '.html', search_path + '.md',
				search_path + '/index.html', search_path + '/index.md')
			for o in options:
				option = frappe.as_unicode(o)
				if os.path.exists(option) and not os.path.isdir(option):
					return get_page_info(option, app, start, app_path=app_path)

	return None

def get_page_context_from_doctype(path):
	page_info = get_page_info_from_doctypes(path)
	if page_info:
		return frappe.get_doc(page_info.get("doctype"),
			page_info.get("name")).get_page_info()

def clear_sitemap():
	delete_page_cache("*")

def get_all_page_context_from_doctypes():
	'''Get all doctype generated routes (for sitemap.xml)'''
	routes = frappe.cache().get_value("website_generator_routes")
	if not routes:
		routes = get_page_info_from_doctypes()
		frappe.cache().set_value("website_generator_routes", routes)

	return routes

def get_page_info_from_doctypes(path=None):
	routes = {}
	for doctype in get_doctypes_with_web_view():
		condition = ""
		values = []
		controller = get_controller(doctype)
		meta = frappe.get_meta(doctype)
		condition_field = meta.is_published_field or controller.website.condition_field

		if condition_field:
			condition ="where {0}=1".format(condition_field)

		if path:
			condition += ' {0} `route`=%s limit 1'.format('and' if 'where' in condition else 'where')
			values.append(path)

		try:
			for r in frappe.db.sql("""select route, name, modified from `tab{0}`
					{1}""".format(doctype, condition), values=values, as_dict=True):
				routes[r.route] = {"doctype": doctype, "name": r.name, "modified": r.modified}

				# just want one path, return it!
				if path:
					return routes[r.route]
		except Exception as e:
			if e.args[0]!=1054: raise e

	return routes

def get_pages(app=None):
	'''Get all pages. Called for docs / sitemap'''

	def _build(app):
		pages = {}

		if app:
			apps = [app]
		else:
			apps = frappe.local.flags.web_pages_apps or frappe.get_installed_apps()

		for app in apps:
			app_path = frappe.get_app_path(app)

			for start in get_start_folders():
				pages.update(get_pages_from_path(start, app, app_path))

		return pages

	return frappe.cache().get_value('website_pages', lambda: _build(app))

def get_pages_from_path(start, app, app_path):
	pages = {}
	start_path = os.path.join(app_path, start)
	if os.path.exists(start_path):
		for basepath, folders, files in os.walk(start_path):
			# add missing __init__.py
			if not '__init__.py' in files:
				open(os.path.join(basepath, '__init__.py'), 'a').close()

			for fname in files:
				fname = frappe.utils.cstr(fname)
				if not '.' in fname:
					continue
				page_name, extn = fname.rsplit(".", 1)
				if extn in ('js', 'css') and os.path.exists(os.path.join(basepath, fname + '.html')):
					# js, css is linked to html, skip
					continue

				if extn in ("html", "xml", "js", "css", "md"):
					page_info = get_page_info(os.path.join(basepath, fname),
						app, start, basepath, app_path, fname)
					pages[page_info.route] = page_info
					# print frappe.as_json(pages[-1])

	return pages

def get_page_info(path, app, start, basepath=None, app_path=None, fname=None):
	'''Load page info'''
	if fname is None:
		fname = os.path.basename(path)

	if app_path is None:
		app_path = frappe.get_app_path(app)

	if basepath is None:
		basepath = os.path.dirname(path)

	page_name, extn = fname.rsplit(".", 1)

	# add website route
	page_info = frappe._dict()

	page_info.basename = page_name if extn in ('html', 'md') else fname
	page_info.basepath = basepath
	page_info.page_or_generator = "Page"

	page_info.template = os.path.relpath(os.path.join(basepath, fname), app_path)

	if page_info.basename == 'index':
		page_info.basename = ""

	# get route from template name
	page_info.route = page_info.template.replace(start, '').strip('/')
	if os.path.basename(page_info.route) in ('index.html', 'index.md'):
		page_info.route = os.path.dirname(page_info.route)

	# remove the extension
	if page_info.route.endswith('.md') or page_info.route.endswith('.html'):
		page_info.route = page_info.route.rsplit('.', 1)[0]

	page_info.name = page_info.page_name = page_info.route
	# controller
	page_info.controller_path = os.path.join(basepath, page_name.replace("-", "_") + ".py")

	if os.path.exists(page_info.controller_path):
		controller = app + "." + os.path.relpath(page_info.controller_path,
			app_path).replace(os.path.sep, ".")[:-3]

		page_info.controller = controller

	# get the source
	setup_source(page_info)

	# extract properties from HTML comments
	load_properties(page_info)

	# if not page_info.title:
	# 	print('no-title-for', page_info.route)

	return page_info

def setup_source(page_info):
	'''Get the HTML source of the template'''
	from markdown2 import markdown
	jenv = frappe.get_jenv()
	source = jenv.loader.get_source(jenv, page_info.template)[0]
	html = ''

	if page_info.template.endswith('.md'):
		source = markdown(source)

	# if only content
	if page_info.template.endswith('.html') or page_info.template.endswith('.md'):
		if ('</body>' not in source) and ('{% block' not in source):
			page_info.only_content = True
			html = '{% extends "templates/web.html" %}'
			html += '\n{% block page_content %}\n' + source + '\n{% endblock %}'
		else:
			html = source

		# load css/js files
		js, css = '', ''

		js_path = os.path.join(page_info.basepath, (page_info.basename or 'index') + '.js')
		if os.path.exists(js_path):
			if not '{% block script %}' in html:
				js = text_type(open(js_path, 'r').read(), 'utf-8')
				html += '\n{% block script %}<script>' + js + '\n</script>\n{% endblock %}'

		css_path = os.path.join(page_info.basepath, (page_info.basename or 'index') + '.css')
		if os.path.exists(css_path):
			if not '{% block style %}' in html:
				css = text_type(open(css_path, 'r').read(), 'utf-8')
				html += '\n{% block style %}\n<style>\n' + css + '\n</style>\n{% endblock %}'

	page_info.source = html

	# show table of contents
	setup_index(page_info)

def setup_index(page_info):
	'''Build page sequence from index.txt'''
	if page_info.basename=='':
		# load index.txt if loading all pages
		index_txt_path = os.path.join(page_info.basepath, 'index.txt')
		if os.path.exists(index_txt_path):
			page_info.index = open(index_txt_path, 'r').read().splitlines()

def load_properties(page_info):
	'''Load properties like no_cache, title from raw'''
	if not page_info.title:
		page_info.title = extract_title(page_info.source, page_info.route)

	# if page_info.title and not '{% block title %}' in page_info.source:
	# 	if not page_info.only_content:
	# 		page_info.source += '\n{% block title %}{{ title }}{% endblock %}'

	if "<!-- no-breadcrumbs -->" in page_info.source:
		page_info.no_breadcrumbs = 1

	if "<!-- show-sidebar -->" in page_info.source:
		page_info.show_sidebar = 1

	if "<!-- add-breadcrumbs -->" in page_info.source:
		page_info.add_breadcrumbs = 1

	if "<!-- no-header -->" in page_info.source:
		page_info.no_header = 1
	# else:
	# 	# every page needs a header
	# 	# add missing header if there is no <h1> tag
	# 	if (not '{% block header %}' in page_info.source) and (not '<h1' in page_info.source):
	# 		if page_info.only_content:
	# 			page_info.source = '<h1>{{ title }}</h1>\n' + page_info.source
	# 		else:
	# 			page_info.source += '\n{% block header %}<h1>{{ title }}</h1>{% endblock %}'

	if "<!-- no-cache -->" in page_info.source:
		page_info.no_cache = 1

	if "<!-- no-sitemap -->" in page_info.source:
		page_info.no_cache = 1

def get_doctypes_with_web_view():
	'''Return doctypes with Has Web View or set via hooks'''
	def _get():
		installed_apps = frappe.get_installed_apps()
		doctypes = frappe.get_hooks("website_generators")
		doctypes += [d.name for d in frappe.get_all('DocType', 'name, module',
			dict(has_web_view=1)) if frappe.local.module_app[frappe.scrub(d.module)] in installed_apps]
		return doctypes

	return frappe.cache().get_value('doctypes_with_web_view', _get)

def sync_global_search():
	'''Sync page content in global search'''
	from frappe.website.render import render_page
	from frappe.utils.global_search import sync_global_search
	from bs4 import BeautifulSoup

	if frappe.flags.update_global_search:
		sync_global_search()
	frappe.flags.update_global_search = []
	frappe.session.user = 'Guest'
	frappe.local.no_cache = True

	frappe.db.sql('delete from __global_search where doctype="Static Web Page"')

	for app in frappe.get_installed_apps(frappe_last=True):
		app_path = frappe.get_app_path(app)

		folders = get_start_folders()

		for start in folders:
			for basepath, folders, files in os.walk(os.path.join(app_path, start)):
				for f in files:
					if f.endswith('.html') or f.endswith('.md'):
						path = os.path.join(basepath, f.rsplit('.', 1)[0])
						try:
							content = render_page(path)
							soup = BeautifulSoup(content, 'html.parser')
							text = ''
							route = os.path.relpath(path, os.path.join(app_path, start))
							for div in soup.findAll("div", {'class':'page-content'}):
								text += div.text

							frappe.flags.update_global_search.append(
								dict(doctype='Static Web Page',
									name=route,
									content=text_type(text),
									published=1,
									title=text_type(soup.title.string),
									route=route))

						except Exception:
							pass

		sync_global_search()

def get_start_folders():
	return frappe.local.flags.web_pages_folders or ('www', 'templates/pages')
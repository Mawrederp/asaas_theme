# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt"


from __future__ import unicode_literals
import frappe
from frappe.utils import cint

def boot_session(bootinfo):
	if frappe.session['user']!='Guest':
		department = frappe.db.sql("""
                        select department 
                        from `tabEmployee`
                        where user_id = '{user_id}'
                        """.format(user_id=frappe.session['user']),as_dict=1)
        if department:
            bootinfo.user_department = department[0].department

		
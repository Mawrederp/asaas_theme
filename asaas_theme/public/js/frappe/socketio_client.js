frappe.socketio = {
	open_tasks: {},
	open_docs: [],
	emit_queue: [],
	init: function() {
		if (frappe.boot.disable_async) {
			return;
		}

		if (frappe.socketio.socket) {
			return;
		}

		if (frappe.boot.developer_mode) {
			// File watchers for development
			frappe.socketio.setup_file_watchers();
		}

		//Enable secure option when using HTTPS
		if (window.location.protocol == "https:") {
			frappe.socketio.socket = io.connect(frappe.socketio.get_host(), {secure: true});
		}
		else if (window.location.protocol == "http:") {
			frappe.socketio.socket = io.connect(frappe.socketio.get_host());
		}
		else if (window.location.protocol == "file:") {
			frappe.socketio.socket = io.connect(window.localStorage.server);
		}

		if (!frappe.socketio.socket) {
			console.log("Unable to connect to " + frappe.socketio.get_host());
			return;
		}

		frappe.socketio.socket.on('msgprint', function(message) {
			frappe.msgprint(message);
		});

		frappe.socketio.socket.on('eval_js', function(message) {
			eval(message);
		});

		frappe.socketio.socket.on('progress', function(data) {
			if(data.progress) {
				data.percent = flt(data.progress[0]) / data.progress[1] * 100;
			}
			if(data.percent) {
				if(data.percent==100) {
					frappe.hide_progress();
				} else {
					frappe.show_progress(data.title || __("Progress"), data.percent, 100);
				}
			}
		});

		frappe.socketio.setup_listeners();
		frappe.socketio.setup_reconnect();
		frappe.socketio.uploader = new frappe.socketio.SocketIOUploader();

		$(document).on('form-load form-rename', function(e, frm) {
			if (frm.is_new()) {
				return;
			}

			for (var i=0, l=frappe.socketio.open_docs.length; i<l; i++) {
				var d = frappe.socketio.open_docs[i];
				if (frm.doctype==d.doctype && frm.docname==d.name) {
					// already subscribed
					return false;
				}
			}

			frappe.socketio.doc_subscribe(frm.doctype, frm.docname);
		});

		$(document).on("form-refresh", function(e, frm) {
			if (frm.is_new()) {
				return;
			}

			frappe.socketio.doc_open(frm.doctype, frm.docname);
		});

		$(document).on('form-unload', function(e, frm) {
			if (frm.is_new()) {
				return;
			}

			// frappe.socketio.doc_unsubscribe(frm.doctype, frm.docname);
			frappe.socketio.doc_close(frm.doctype, frm.docname);
		});

		window.onbeforeunload = function() {
			if (!cur_frm || cur_frm.is_new()) {
				return;
			}

			// if tab/window is closed, notify other users
			if (cur_frm.doc) {
				frappe.socketio.doc_close(cur_frm.doctype, cur_frm.docname);
			}
		}
	},
	get_host: function() {
		var host = window.location.origin;
		if(window.dev_server) {
			var parts = host.split(":");
			var port = frappe.boot.socketio_port || '3000';
			if(parts.length > 2) {
				host = parts[0] + ":" + parts[1];
			}
			host = host + ":" + port;
		}
		return host;
	},
	subscribe: function(task_id, opts) {
		// TODO DEPRECATE

		frappe.socketio.socket.emit('task_subscribe', task_id);
		frappe.socketio.socket.emit('progress_subscribe', task_id);

		frappe.socketio.open_tasks[task_id] = opts;
	},
	task_subscribe: function(task_id) {
		frappe.socketio.socket.emit('task_subscribe', task_id);
	},
	task_unsubscribe: function(task_id) {
		frappe.socketio.socket.emit('task_unsubscribe', task_id);
	},
	doc_subscribe: function(doctype, docname) {
		if (frappe.flags.doc_subscribe) {
			console.log('throttled');
			return;
		}

		frappe.flags.doc_subscribe = true;

		// throttle to 1 per sec
		setTimeout(function() { frappe.flags.doc_subscribe = false }, 1000);

		frappe.socketio.socket.emit('doc_subscribe', doctype, docname);
		frappe.socketio.open_docs.push({doctype: doctype, docname: docname});
	},
	doc_unsubscribe: function(doctype, docname) {
		frappe.socketio.socket.emit('doc_unsubscribe', doctype, docname);
		frappe.socketio.open_docs = $.filter(frappe.socketio.open_docs, function(d) {
			if(d.doctype===doctype && d.name===docname) {
				return null;
			} else {
				return d;
			}
		})
	},
	doc_open: function(doctype, docname) {
		// notify that the user has opened this doc, if not already notified
		if(!frappe.socketio.last_doc
			|| (frappe.socketio.last_doc[0]!=doctype && frappe.socketio.last_doc[0]!=docname)) {
			frappe.socketio.socket.emit('doc_open', doctype, docname);
		}
		frappe.socketio.last_doc = [doctype, docname];
	},
	doc_close: function(doctype, docname) {
		// notify that the user has closed this doc
		frappe.socketio.socket.emit('doc_close', doctype, docname);
	},
	setup_listeners: function() {
		frappe.socketio.socket.on('task_status_change', function(data) {
			frappe.socketio.process_response(data, data.status.toLowerCase());
		});
		frappe.socketio.socket.on('task_progress', function(data) {
			frappe.socketio.process_response(data, "progress");
		});
	},
	setup_reconnect: function() {
		// subscribe again to open_tasks
		frappe.socketio.socket.on("connect", function() {
			// wait for 5 seconds before subscribing again
			// because it takes more time to start python server than nodejs server
			// and we use validation requests to python server for subscribing
			setTimeout(function() {
				$.each(frappe.socketio.open_tasks, function(task_id, opts) {
					frappe.socketio.subscribe(task_id, opts);
				});

				// re-connect open docs
				$.each(frappe.socketio.open_docs, function(d) {
					if(locals[d.doctype] && locals[d.doctype][d.name]) {
						frappe.socketio.doc_subscribe(d.doctype, d.name);
					}
				});

				if (cur_frm && cur_frm.doc) {
					frappe.socketio.doc_open(cur_frm.doc.doctype, cur_frm.doc.name);
				}
			}, 5000);
		});
	},
	setup_file_watchers: function() {
		var host = window.location.origin;
		if(!window.dev_server) {
			return;
		}

		var port = frappe.boot.file_watcher_port || 6787;
		var parts = host.split(":");
		// remove the port number from string if exists
		if (parts.length > 2) {
			host = host.split(':').slice(0, -1).join(":");
		}
		host = host + ':' + port;

		frappe.socketio.file_watcher = io.connect(host);
		// css files auto reload
		frappe.socketio.file_watcher.on('reload_css', function(filename) {
			let abs_file_path = "assets/" + filename;
			const link = $(`link[href*="${abs_file_path}"]`);
			abs_file_path = abs_file_path.split('?')[0] + '?v='+ moment();
			link.attr('href', abs_file_path);
			frappe.show_alert({
				indicator: 'orange',
				message: filename + ' reloaded'
			}, 5);
		});
		// js files show alert

		// commenting as this kills a branch change
		// frappe.socketio.file_watcher.on('reload_js', function(filename) {
		// 	filename = "assets/" + filename;
		// 	var msg = $(`
		// 		<span>${filename} changed <a data-action="reload">Click to Reload</a></span>
		// 	`)
		// 	msg.find('a').click(frappe.ui.toolbar.clear_cache);
		// 	frappe.show_alert({
		// 		indicator: 'orange',
		// 		message: msg
		// 	}, 5);
		// });
	},
	process_response: function(data, method) {
		if(!data) {
			return;
		}

		// success
		var opts = frappe.socketio.open_tasks[data.task_id];
		if(opts[method]) {
			opts[method](data);
		}

		// "callback" is std frappe term
		if(method==="success") {
			if(opts.callback) opts.callback(data);
		}

		// always
		frappe.request.cleanup(opts, data);
		if(opts.always) {
			opts.always(data);
		}

		// error
		if(data.status_code && data.status_code > 400 && opts.error) {
			opts.error(data);
		}
	}
}

frappe.provide("frappe.realtime");
frappe.realtime.on = function(event, callback) {
	frappe.socketio.socket && frappe.socketio.socket.on(event, callback);
};

frappe.realtime.off = function(event, callback) {
	frappe.socketio.socket && frappe.socketio.socket.off(event, callback);
}

frappe.realtime.publish = function(event, message) {
	if(frappe.socketio.socket) {
		frappe.socketio.socket.emit(event, message);
	}
}

frappe.socketio.SocketIOUploader = class SocketIOUploader {
	constructor() {
		frappe.socketio.socket.on('upload-request-slice', (data) => {
			var place = data.currentSlice * this.chunk_size,
				slice = this.file.slice(place,
					place + Math.min(this.chunk_size, this.file.size - place));

			if (this.on_progress) {
				// update progress
				this.on_progress(place / this.file.size * 100);
			}

			this.reader.readAsArrayBuffer(slice);
			this.started = true;
			this.keep_alive();
		});

		frappe.socketio.socket.on('upload-end', (data) => {
			this.reader = null;
			this.file = null;
			if (data.file_url.substr(0, 7)==='/public') {
				data.file_url = data.file_url.substr(7);
			}
			this.callback(data);
		});

		frappe.socketio.socket.on('upload-error', (data) => {
			this.disconnect(false);
			frappe.msgprint({
				title: __('Upload Failed'),
				message: data.error,
				indicator: 'red'
			});
		});

		frappe.socketio.socket.on('disconnect', () => {
			this.disconnect();
		});
	}

	start({file=null, is_private=0, filename='', callback=null, on_progress=null,
		chunk_size=24576, fallback=null} = {}) {

		if (this.reader) {
			frappe.throw(__('File Upload in Progress. Please try again in a few moments.'));
		}

		if (!frappe.socketio.socket.connected) {
			if (fallback) {
				fallback();
				return;
			} else {
				frappe.throw(__('Socketio is not connected. Cannot upload'));
			}
		}

		this.reader = new FileReader();
		this.file = file;
		this.chunk_size = chunk_size;
		this.callback = callback;
		this.on_progress = on_progress;
		this.fallback = fallback;
		this.started = false;

		this.reader.onload = () => {
			frappe.socketio.socket.emit('upload-accept-slice', {
				is_private: is_private,
				name: filename,
				type: this.file.type,
				size: this.file.size,
				data: this.reader.result
			});
			this.keep_alive();
		};

		var slice = file.slice(0, this.chunk_size);
		this.reader.readAsArrayBuffer(slice);
	}

	keep_alive() {
		if (this.next_check) {
			clearTimeout (this.next_check);
		}
		this.next_check = setTimeout (() => {
			if (!this.started) {
				// upload never started, so try fallback
				if (this.fallback) {
					this.fallback();
				} else {
					this.disconnect();
				}
			}
			this.disconnect();
		}, 3000);
	}

	disconnect(with_message = true) {
		if (this.reader) {
			this.reader = null;
			this.file = null;
			frappe.hide_progress();
			if (with_message) {
				frappe.msgprint({
					title: __('File Upload'),
					message: __('File Upload Disconnected. Please try again.'),
					indicator: 'red'
				});
			}
		}
	}

}
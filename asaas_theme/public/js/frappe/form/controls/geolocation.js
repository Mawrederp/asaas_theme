frappe.ui.form.ControlGeolocation = frappe.ui.form.ControlCode.extend({
	make_wrapper() {
		// Create the elements for map area
		this._super();

		let $input_wrapper = this.$wrapper.find('.control-input-wrapper');
		this.map_id = frappe.dom.get_unique_id();
		this.map_area = $(
			`<div class="map-wrapper border">
				<div id="` + this.map_id + `" style="min-height: 400px; z-index: 1; max-width:100%"></div>
			</div>`
		);
		this.map_area.prependTo($input_wrapper);
		this.$wrapper.find('.control-input').addClass("hidden");
		this.bind_leaflet_map();
		this.bind_leaflet_draw_control();
		this.bind_leaflet_locate_control();
		this.bind_leaflet_refresh_button();
	},

	format_for_input(value) {
		// render raw value from db into map
		this.clear_editable_layers();
		if(value) {
			var data_layers = new L.FeatureGroup()
				.addLayer(L.geoJson(JSON.parse(value),{
					pointToLayer: function(geoJsonPoint, latlng) {
						if (geoJsonPoint.properties.point_type == "circle"){
							return L.circle(latlng, {radius: geoJsonPoint.properties.radius});
						} else if (geoJsonPoint.properties.point_type == "circlemarker") {
							return L.circleMarker(latlng, {radius: geoJsonPoint.properties.radius});
						}
						else {
							return L.marker(latlng);
						}
					}
				}));
			this.add_non_group_layers(data_layers, this.editableLayers);
			try {
				this.map.flyToBounds(this.editableLayers.getBounds(), {
					padding: [50,50]
				});
			}
			catch(err) {
				// suppress error if layer has a point.
			}
			this.editableLayers.addTo(this.map);
			this.map._onResize();
		} else if ((value===undefined) || (value == JSON.stringify(new L.FeatureGroup().toGeoJSON()))) {
			this.locate_control.start();
		}
	},

	bind_leaflet_map() {

		var circleToGeoJSON = L.Circle.prototype.toGeoJSON;
		L.Circle.include({
			toGeoJSON: function() {
				var feature = circleToGeoJSON.call(this);
				feature.properties = {
					point_type: 'circle',
					radius: this.getRadius()
				};
				return feature;
			}
		});

		L.CircleMarker.include({
			toGeoJSON: function() {
				var feature = circleToGeoJSON.call(this);
				feature.properties = {
					point_type: 'circlemarker',
					radius: this.getRadius()
				};
				return feature;
			}
		});

		L.Icon.Default.imagePath = '/assets/frappe/images/leaflet/';
		this.map = L.map(this.map_id).setView([19.0800, 72.8961], 13);

		L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(this.map);
	},

	bind_leaflet_locate_control() {
		// To request location update and set location, sets current geolocation on load
		this.locate_control = L.control.locate({position:'topright'});
		this.locate_control.addTo(this.map);
	},

	bind_leaflet_draw_control() {
		this.editableLayers = new L.FeatureGroup();

		var options = {
			position: 'topleft',
			draw: {
				polyline: {
					shapeOptions: {
						color: frappe.ui.color.get('blue'),
						weight: 10
					}
				},
				polygon: {
					allowIntersection: false, // Restricts shapes to simple polygons
					drawError: {
						color: frappe.ui.color.get('orange'), // Color the shape will turn when intersects
						message: '<strong>Oh snap!<strong> you can\'t draw that!' // Message that will show when intersect
					},
					shapeOptions: {
						color: frappe.ui.color.get('blue')
					}
				},
				circle: true,
				rectangle: {
					shapeOptions: {
						clickable: false
					}
				}
			},
			edit: {
				featureGroup: this.editableLayers, //REQUIRED!!
				remove: true
			}
		};

		// create control and add to map
		var drawControl = new L.Control.Draw(options);

		this.map.addControl(drawControl);

		this.map.on('draw:created', (e) => {
			var type = e.layerType,
				layer = e.layer;
			if (type === 'marker') {
				layer.bindPopup('Marker');
			}
			this.editableLayers.addLayer(layer);
			this.set_value(JSON.stringify(this.editableLayers.toGeoJSON()));
		});

		this.map.on('draw:deleted draw:edited', (e) => {
			var layer = e.layer;
			this.editableLayers.removeLayer(layer);
			this.set_value(JSON.stringify(this.editableLayers.toGeoJSON()));
		});
	},

	bind_leaflet_refresh_button() {
		L.easyButton({
			id: 'refresh-map-'+this.df.fieldname,
			position: 'topright',
			type: 'replace',
			leafletClasses: true,
			states:[{
				stateName: 'refresh-map',
				onClick: function(button, map){
					map._onResize();
				},
				title: 'Refresh map',
				icon: 'fa fa-refresh'
			}]
		}).addTo(this.map);
	},

	add_non_group_layers(source_layer, target_group) {
		// https://gis.stackexchange.com/a/203773
		// Would benefit from https://github.com/Leaflet/Leaflet/issues/4461
		if (source_layer instanceof L.LayerGroup) {
			source_layer.eachLayer((layer)=>{
				this.add_non_group_layers(layer, target_group);
			});
		} else {
			target_group.addLayer(source_layer);
		}
	},

	clear_editable_layers() {
		this.editableLayers.eachLayer((l)=>{
			this.editableLayers.removeLayer(l);
		});
	}
});

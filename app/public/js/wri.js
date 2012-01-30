/*
 ===============================================
 main enter point
 ===============================================
*/

App.modules.WRI= function(app) {

   // app router
   var Router = Backbone.Router.extend({
      routes: {
        ":country": "country",
        ":country/s/*state": "country"
      },

      country: function(country, state) {
        app.Log.log("route: country" + country + " " + state);
      }

    });

    /**
     * contry model from gadm0 table in cartodb
     */
    var Country = app.CartoDB.CartoDBModel.extend({
      table: "gadm0",
      columns: {
        'id': 'cartodb_id',
        'name': 'name_engli',
        'center': 'ST_Centroid(the_geom)',
        'bbox': 'ST_Envelope(the_geom)'
      },
      what: 'name_engli'
    });

    // the app
    app.WRI = Class.extend({

        init: function() {
            _.bindAll(this, 'on_route');
            $('html,body').css({'overflow-x': 'hidden'});
        },

        run: function() {
            _.bindAll(this, 'on_route_to', '_state_url', 'set_state');
            var self = this;

            // set a global bus
            this.bus = new app.Bus();
            app.bus = this.bus;

            // the map
            this.map = new app.Map(this.bus);

            // init routing and app state
            this.router = new Router();
            this.router.bind('route:country', this.on_route);
            this.app_state = new app.State();
            this.app_state.set_router(this.router);
            this.state_url = _.debounce(this._state_url, 200);

            this.state = [];
            this.level = 0;


            // slider
            this.slider = new Slider({el: $(".slider")});
            this.slider.bind('change', function(v) {
                // timestamp to month
                var start = new Date(2006, 1, 1).getTime();
                var d = v - start;
                var months = d/(3600*1000*24*30);
                self.map.set_time(months>>0);
            });

            this.bus.on('app:route_to', this.on_route_to);

            this.map.map.bind('center_changed', this.state_url);
            this.map.map.bind('zoom_changed', this.state_url);
            this.map.show_controls(true);
            this.app_state.bind('change:map', this.set_state);


            // ready, luanch
            Backbone.history.start();

            //this.add_test_layer();
            //this.add_time_layer();
        },





        _state_url: function() {
            var self = this;
            var c = self.map.map.get_center();
            self.app_state.set({
                'map': {
                    center: {
                        lat: c.lat(),
                        lon: c.lng()
                    },
                    zoom: self.map.map.get_zoom()
                }
            });
            self.app_state.save();
        },

        set_state: function(state) {
          var self = this;
          var st = state.get('map');
          self.map.map.set_center(new google.maps.LatLng(st.center.lat,st.center.lon));
          self.map.map.set_zoom(st.zoom);
       },

       on_route: function(country, state) {
            var self = this;

            if(state) {
                this.app_state.fetch(state);
            } else {
                var c = new Country({'name_engli': country});
                c.fetch();
                c.bind('change', function() {
                    self.map.center_map_on(c.get('bbox'));
                });
            }

            //TODO: make a method
            self.map.show_country(country);
        },

        on_route_to: function(route) {
            app.Log.debug("route => ", route);
            this.router.navigate(route, true);
        }

    });
};



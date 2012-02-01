
App.modules.Country = function(app) {

    var Country = app.CartoDB.CartoDBModel.extend({
      table: 'country_attributes_live',
      columns: {
        'id': 'cartodb_id',
        'name': 'name_engli',
        'center': 'ST_Centroid(the_geom)',
        'bbox': 'ST_Envelope(the_geom)',
        'unregion1': 'unregion1',
        'unregion2': 'unregion2',
        'cumm': 'cumm',
        'iso': 'iso',
        'total_incr': 'total_incr',
        'start_value': 'start_value',
        'description': 'description'
      },
      what: 'name_engli',

      center: function() {
            c = this.get('center');
            if(c) return c;
            return JSON.parse(this.get('the_geom')).coordinates;
      },

      time_series: function() {
            return this.get('cumm');
      },

      time_series_deltas: function() { 
          if(this._time_series_deltas) return this._time_series_deltas;
          var ts = this.time_series();
          var deltas = [];
          deltas.push(0);
          for(var i = 1, l = ts.length; i < l; ++i) {
              deltas.push(ts[i] - ts[i-1]);
          }
          this._time_series_deltas = deltas;
          return deltas;
      },

      slug: function() {
          return this.get('name_engli');
      },

      max_deforestation: function() {
          return _.max(this.time_series());
      },

      // given the max deforestation generates
      // time_series_normalized attribute
      gen_normalized_deforestation: function(v) {
          this.set({'time_series_normalized': 
            _(this.time_series()).map(function(def) {
                return def/v;
            })
          });
      },

      def_percent_in_month: function(month) {
            return this.get('time_series_normalized')[month]*100.0;
      }

    });


    /**
     * countries collection
     */
    var Countries = app.CartoDB.CartoDBCollection.extend({
      model: Country,
      table: 'country_attributes_live',
      columns: [
        'unregion1',
        'unregion2',
        'name_engli',
        'cumm',
        'total_incr',
        'start_value',
        'iso',
        'ST_AsGeoJSON(ST_Centroid(the_geom)) as the_geom'
      ],
      where: 'start_value is not NULL',
      cache: true,

      initialize: function() {
          this.bind('reset', this.normalize_deforestation);
      },

      inside: function(areas) {

        if(!_.isArray(areas)) {
            areas = [areas];
        }

        return this.filter(function(c) {
          return _.indexOf(areas, c.get('unregion1')) >= 0;
        });
      },

      normalize_deforestation: function() {
          // get the max
          var def = this.map(function(c) {
              return c.max_deforestation();
          });
          var max_def = _.max(def);
          // normalize
          this.each(function(c) {
              c.gen_normalized_deforestation(max_def);
          });
      },

      next_country: function(country) {
          var m = this.models;
          for(var i = 0; i < m.length; ++i) {
              var c = m[i];
              if(c.get('name_engli') === country) {
                  var prev = i - 1;
                  if(prev < 0) {
                      prev += m.length;
                  }
                  prev = prev % m.length;
                  var next = (i + 1) % m.length;
                  return [m[prev], m[next]];
              }
          }
          return null;
      }

    });

    app.Country = Country;
    app.Countries = Countries;
}

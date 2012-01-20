/*
 ====================
 this class renders deforestation data in a given time
 ====================
*/

function TimePlayer(table) {
    this.time = 0;
    this.canvas_setup = this.get_time_data;
    this.render = this.render_time;
    this.cells = [];
    this.table = table;
    this.base_url = 'http://wri-01.cartodb.com/api/v2/sql';
}

TimePlayer.prototype = new CanvasTileLayer();

TimePlayer.prototype.set_time = function(t) {
    this.time = t;
    this.redraw();
};

TimePlayer.prototype.sql = function(sql, callback) {
    var self = this;
    $.getJSON(this.base_url  + "?q=" + encodeURIComponent(sql) ,function(data){
        callback(data);
    });
}

TimePlayer.prototype.pre_cache_months = function(rows) {
    var row;
    var cells = [];
    for(var i in rows) {
      row = rows[i];
      // filter the spikes in deforestation change
      var def = row.time_series;
      var last = 0;

      for(var d = 0; d < def.length; ++d) {
        if(def[d] > 0) {
          last = d;
        }
        def[d] = Math.max(0, 3 - (d - last));
      }

      cells[i] = {
        x: row.upper_left_x,
        y: row.upper_left_y,
        w: row.cell_width,
        h: row.cell_height,
        months_accum: row.cummulative,
        months: row.time_series
      }
    }
    return cells;
}

// get time data in json format
TimePlayer.prototype.get_time_data = function(tile, coord, zoom) {
    var self = this;

    var projection = new MercatorProjection();
    var bbox = projection.tileBBox(coord.x, coord.y, zoom);
    var sql = "SELECT upper_left_x, upper_left_y, cell_width, cell_height, pixels, total_incr as events, cummulative, boxpoly, time_series, time_series, the_geom_webmercator FROM " + this.table;

    sql += " WHERE the_geom && ST_SetSRID(ST_MakeBox2D(";
    sql += "ST_Point(" + bbox[0].lng() + "," + bbox[0].lat() +"),";
    sql += "ST_Point(" + bbox[1].lng() + "," + bbox[1].lat() +")), 4326)";

    this.sql(sql, function(data) {
        tile.cells = self.pre_cache_months(data.rows);
    });
}


var originShift = 2 * Math.PI* 6378137 / 2.0;
var initialResolution = 2 * Math.PI * 6378137 / 256.0;

function meterToPixels(mx, my, zoom) {
  var res = initialResolution / (1 << zoom);
  var px = (mx + originShift) / res;
  var py = (my + originShift) / res;
  return [px, py];
}

function meterToPixelsDist(mx, my, zoom) {
  var res = initialResolution / (1 << zoom);
  var px = (mx) / res;
  var py = (my) / res;
  return [px, py];
}


TimePlayer.prototype.render_time = function(tile, coord, zoom) {
    var projection = new MercatorProjection();
    var month = 1 + this.time>>0;
    var w = tile.canvas.width;
    var h = tile.canvas.height;
    var ctx = tile.ctx;
    var data, i, j, x, y, def, size;

    var total_pixels = 256 << zoom;

    var cells = tile.cells;
    if(!cells) return;
    var cell;
    var point;
    var x, y;

    // clear canvas
    tile.canvas.width = w;

    ctx.fillStyle = "#000";
    point = projection.tilePoint(coord.x, coord.y, zoom);

    var colors = [
        'rgba(255, 51, 51, 0.9)',
        'rgba(170, 52, 51, 0.6)',
        'rgba(104, 48, 59, 0.6)',
        'rgba(84, 48, 59, 0.6)'
    ];

    // render cells
    for(i=0; i < cells.length; ++i) {
      cell = cells[i];

      //transform to local tile x/y
      //TODO: precache this
      pixels = meterToPixels(cell.x, cell.y, zoom);
      pixels[1] = total_pixels - pixels[1];
      x = pixels[0] - point[0];
      y = pixels[1] - point[1];
      size = meterToPixelsDist(cell.w, cell.w, zoom);

      var extra = 0;
      //var c = (cell.months[month]/10)>>0;
      ctx.fillStyle = 'rgba(84, 48, 59, 0.6)';
      if(cell.months) {
        var c =  cell.months[month];
        var a =  cell.months_accum[month];
        idx = 3 - c;
        ctx.fillStyle = colors[idx];//"rgb(" + c + ",0, 0)";
        if(idx == 0) extra = 1;
        if(a === 0) {
          ctx.fillStyle = 'rgba(0,0,0,0)';
        }
      }
      // render
      var s = size[0] >> 0;
      s+=extra;
      ctx.fillRect(x, y, s, s);
    }
};


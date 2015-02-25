/* Modules */
var request = require("request");
var Qs = require("qs"); // for query strings
var GeoJSON = require("geojson");
var Store = require("jfs") // JSON file store

/* Setup vars */
var hs = new Store("./hackerspaces.json",{pretty:true});
var hsgeo = new Store("./hackerspaces_geo.json",{pretty:true});

var hackerspaces_endpoint = "http://hackerspaces.org/w/api.php"

var exchanges_params = {
  action: 'askargs',
  format: 'json',
  conditions: 'Category:Hackerspace|exchanges::!no|hackerspace%20status::active|Has%20coordinates::%2B', // %2B is null
  printouts: 'location|exchanges|residencies|city|email|phone',
  parameters: null // useful for offset below
  };
var residencies_params = {
  action: 'askargs',
  format: 'json',
  conditions: 'Category:Hackerspace|residencies::!no|hackerspace%20status::active|Has%20coordinates::%2B', // %2B is null
  printouts: 'location|exchanges|residencies|city|email|phone',
  parameters: null // useful for offset below
  };

/* Query MediaWiki API
   (with semantic mediawiki query)
   save items to json file store */
function get_hackerspaces(params) {
  var query = hackerspaces_endpoint + "?" + decodeURIComponent(Qs.stringify(params));
  request( query,
    function (error, response, body) {
      if (error) {
        console.log(error)
        }
        if (!error && response.statusCode == 200) {
        // console.log(body)
        var results = JSON.parse(body);
        for(i in results['query']['results']) {
          var h = { // hackerspace object
            name: i,
            url: results['query']['results'][i]['fullurl'],
            //site: results['query']['results'][i]['printouts']['site'][0], // not working in mw API!!!
            email: results['query']['results'][i]['printouts']['email'][0],
            phone: results['query']['results'][i]['printouts']['phone'][0],
            lat: results['query']['results'][i]['printouts']['location'][0]['lat'],
            lon: results['query']['results'][i]['printouts']['location'][0]['lon'],
            city: results['query']['results'][i]['printouts']['city'][0]['fulltext'],
            city_url: results['query']['results'][i]['printouts']['city'][0]['fullurl'],
            exchanges: results['query']['results'][i]['printouts']['exchanges'][0],
            residencies: results['query']['results'][i]['printouts']['residencies'][0]
	  };

	  /* save each item to hs */
	  hs.save(i, h, function(err){}); // keyed on name

          /* set offset for recursion */
	  offset = results['query-continue-offset']

          }
	  /* Recursive step, until no further offset */
	if (offset) {
          params["parameters"] = 'offset%3d' + offset
          interval = 1000 * (Math.random() + 0.1) // random-ish in milliseconds
	  setTimeout(get_hackerspaces( params ), interval);
	}
      }
    }
  )
}

function convert_hackerspaces_to_geojson(hsdb) {
  if (Object.keys(hsdb.allSync()).length) {
    hsdb.all(function(err, hsobjs) {
      if (err) {
        console.log(err);
      }
      if (!err) {
	  var h = [];
	  for (s in hsobjs) {
            s = hsobjs[s]
            var popupContent = '<a href="' + s['url'] + '" target="_blank">' + s['name'] + '</a><br/>City: <a href="' + s['city_url'] + '" target="_blank">' + s['city'] + '</a><br/>Email: <a href="' + s['email'] + '">contact</a><br/>Phone: ' + s['phone'] +  '<br/><a href="http://hackerspaces.org/wiki/Exchanges" target="_blank">Exchanges</a>: ' + s['exchanges'] + '<br/><a href="http://hackerspaces.org/wiki/Residencies" target="_blank">Residencies</a>: ' + s['residencies'];
	    s['popupContent'] = popupContent
	    h.push(s)
	  };
	}
      hgeo = GeoJSON.parse(h, {Point: ['lat', 'lon'], include: ['name', 'url', 'email', 'phone', 'city', 'city_url', 'popupContent']});
      hsgeo.save("geojson", hgeo, function(err){});
    })
  }
}


/*
{ "type": "FeatureCollection",
  "features": [
    { "type": "Feature",
      "geometry": {"type": "Point", "coordinates": [102.0, 0.5]},
      "properties": {"prop0": "value0"}
      }
  ]
}
*/

/* Execute! */

/* Get hackerspaces data for each set of query parameters! */
var queries = [ exchanges_params, residencies_params ];
queries.forEach(function(entry) { get_hackerspaces(entry) });

/* Convert json from api to geojson */
convert_hackerspaces_to_geojson(hs)

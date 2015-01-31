/* Modules */
var request = require("request");
var Qs = require("qs"); // for query strings
var GeoJSON = require("geojson");
var Store = require("jfs") // JSON file store

/* Setup vars */
var db = new Store("./data.json",{pretty:true});

var hackerspaces_endpoint = "http://hackerspaces.org/w/api.php"
var exchanges_params = {
  action: 'askargs',
  format: 'json',
  conditions: 'Category:Hackerspace|exchanges::!no|hackerspace%20status::active|Has%20coordinates::%2B', // %2B is null
  printouts: 'location|exchanges|residencies|city|email|phone'
  };
var residencies_params = {
  action: 'askargs',
  format: 'json',
  conditions: 'Category:Hackerspace|residencies::!no|hackerspace%20status::active|Has%20coordinates::%2B', // %2B is null
  printouts: 'location|exchanges|residencies|city|email|phone'
  };
var exchanges_query = hackerspaces_endpoint + "?" + decodeURIComponent(Qs.stringify(exchanges_params));
console.log(exchanges_query)
var residencies_query = hackerspaces_endpoint + "?" + decodeURIComponent(Qs.stringify(residencies_params));
console.log(residencies_query)

/* Query MediaWiki API (with semantic mediawiki query), save items to json file */
function get_hackerspaces(url) {
  request( url,
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
            //site: results['query']['results'][i]['printouts']['site'][0], // not working in API!!!
            email: results['query']['results'][i]['printouts']['email'][0],
            phone: results['query']['results'][i]['printouts']['phone'][0],
            lat: results['query']['results'][i]['printouts']['location'][0]['lat'],
            lon: results['query']['results'][i]['printouts']['location'][0]['lon'],
            city: results['query']['results'][i]['printouts']['city'][0]['fulltext'],
            city_url: results['query']['results'][i]['printouts']['city'][0]['fullurl']
	  };
	  /* save each item to db */
	  db.save(i, h, function(err){}); // keyed on name

          /*loc = JSON.stringify(results['query']['results'][i]['printouts']['location'])*/
          console.log(h['name']);
          }
      }
    }
  )
}

get_hackerspaces( exchanges_query )

/*

      GeoJSON.parse(results, {Point: ['lat', 'lng']}, function(geojson){
        console.log(geojson);
      });
      jsonToGeoJson(body)

    }
  }
)
*/

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

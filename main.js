
var mymap = L.map("map",{maxZoom:19}).setView([52.22, 21.01], 11);
var OpenStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {}).addTo(mymap);
var orto = L.tileLayer('http://www.google.cn/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}', { attribution: 'google'});
var baseLayers = {
    "OpenStreetMap": OpenStreetMap,
    "Ortofotomapa": orto
};
L.control.layers(baseLayers, null, {position:'bottomright'}).addTo(mymap);

mymap.attributionControl.setPrefix('<a href="http://leaflet.com">Leaflet</a> |Mój pierwszy geoportal w Leaflet');
var markers = L.layerGroup().addTo(mymap);
var campSiteIcon = L.divIcon({
    className: 'campsite-icon',
    html: '<i class="fas fa-campground"></i>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

var themeParkIcon = L.divIcon({
    className: 'theme-park-icon',
    html: '<i class="fas fa-rocket"></i>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});
var attractionIcon = L.divIcon({
    className: 'attraction-icon',
    html: '<i class="fas fa-archway"></i>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});
var viewpointIcon = L.divIcon({
    className: 'viewpoint-icon',
    html: '<i class="fas fa-binoculars"></i>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});
var zooIcon = L.divIcon({
    className: 'zoo-icon',
    html: '<i class="fas fa-hippo"></i>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});
var museumIcon = L.divIcon({
    className: 'museum-icon',
    html: '<i class="fas fa-landmark"></i>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});



function autocomplete(inputId, suggestionsId, otherSuggestionsId) {
  $(inputId).on('input', function() {
      var query = $(this).val();
      if (query.length > 1) {
          $.getJSON('https://photon.komoot.io/api/?q=' + query, function(data) {
              $(suggestionsId).empty();
              data.features.forEach(function(feature) {
                  var suggestion = $('<div>' + feature.properties.name + '</div>');
                  suggestion.on('click', function() {
                      $(inputId).val(feature.properties.name);
                      $(suggestionsId).empty();
                  });
                  $(suggestionsId).append(suggestion);
              });
          });
      }
  }).on('focus', function() {
      $(otherSuggestionsId).empty();
  });
}

autocomplete('#search', '#suggestions', '#suggestions2');
autocomplete('#search2', '#suggestions2', '#suggestions');
autocomplete('#search3', '#suggestions3', '#suggestions3');

mymap.on('click', function() {
  $('#suggestions').empty();
  $('#suggestions2').empty();
  $('#suggestions3').empty();
});

function geocode(address) {
  return $.getJSON('https://photon.komoot.io/api/?q=' + address)
      .then(function(data) {
          if (data.features && data.features.length > 0) {
              return data.features[0].geometry.coordinates;
          } else {
              return null;
          }
      });
}
var radius=0;
var control;
$('.dropdown').click(function(){
    $(this).find('.dropdown-content').slideToggle("fast");
});
$('#myRange').on('input', function() {
    radius = $(this).val();
    $('#demo').text(radius);
});
$('#okButton').on('click', function(e) {
    e.preventDefault();
    $('.dropdown-content').hide();
});
var addedPoints = [];
function drawRoute(startCoords, endCoords) {
    buffer=null;
    bbox=null;
    markers.clearLayers();
  if (control) {
    mymap.removeControl(control);
    mymap.removeLayer(control);
    control = null;
  }
   control = L.Routing.control({
      waypoints: [
          L.latLng(startCoords[1], startCoords[0]),
          L.latLng(endCoords[1], endCoords[0])
      ],
      routeWhileDragging: false,
      show: false
      
  }).addTo(mymap);
  control.on('routesfound', function(e) {
    var routes = e.routes;
    var summary = routes[0].summary;
    console.log('Total distance: ' + summary.totalDistance + ' meters');
    var odleglosc=summary.totalDistance/1000;
    odleglosc=odleglosc.toFixed(2);
    console.log('Total time: ' + summary.totalTime + ' seconds');
    var czas = summary.totalTime / 3600;
    var hours = Math.floor(czas);
    var minutes = Math.round((czas - hours) * 60);

    if (czas >= 1) {
        document.getElementById('totalTime').textContent='Czas przejazdu: '+hours+' godzin '+minutes+' minut';
    } else {
        czas = Math.round(czas * 60) + ' minutes';
        document.getElementById('totalTime').textContent='Czas przejazdu: '+minutes+' minut';
    }
    document.getElementById('totalDistance').textContent='Długość trasy: '+odleglosc+' kilometrów';
    if(radius>0){
    var route = routes[0].coordinates;
    var routeCoordinates = route.map(function(coordinate) {
        return [coordinate.lng, coordinate.lat];
    });
    var routeBounds = L.latLngBounds(routeCoordinates);
    mymap.fitBounds(routeBounds,{padding:[25,25]});
    radius=Number(radius);
    var buffer = turf.buffer(turf.lineString(routeCoordinates), radius, {units:'kilometers'});
    var bbox = turf.bbox(buffer);
    console.log('box',bbox);
    //L.geoJSON(buffer).addTo(mymap);
    var overpassQuery = `
      [out:json][timeout:25];
      (
        node["tourism"="camp_site"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
        node["tourism"="theme_park"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
        node["tourism"="attraction"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
        node["tourism"="viewpoint"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
        node["tourism"="zoo"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
        node["tourism"="museum"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
      );
      out body 70;
      >;
      out skel qt;
    `;
    $.ajax({
        url: "https://overpass-api.de/api/interpreter",
        type: "GET",
        data: { "data": overpassQuery },
        success: function(data) {
            var geojsonData = osmtogeojson(data);
            geojsonData.features = geojsonData.features.filter(function(feature) {
                return turf.inside(feature, buffer);
            });
            
            L.geoJSON(geojsonData, {
                pointToLayer: function(feature, latlng) {
                    var icon;
                    var popupContent = feature.properties.name 
                    ? "<b>" + feature.properties.name.replace('_', ' ') + "</b>" 
                    : "<b>" + feature.properties.tourism.replace('_', ' ')+"</b>";
                    popupContent +='<br><button id="add-to-route">Dodaj do swojej trasy</button>';
                    switch (feature.properties.tourism) {
                        case 'camp_site':
                            icon = campSiteIcon;
                            break;
                        case 'theme_park':
                            icon = themeParkIcon;
                            break;
                        case 'attraction':
                            icon = attractionIcon;
                            break;
                        case 'viewpoint':
                            icon = viewpointIcon;
                            break;
                        case 'zoo':
                            icon = zooIcon;
                            break;
                        case 'museum':
                            icon = museumIcon;
                            break;
                    }
                    
                    var marker = L.marker(latlng, {icon: icon}).bindPopup(popupContent).addTo(markers);
                    waypoints = control.getWaypoints();
                    waypoints = Array.from(waypoints);
                    marker.on('popupopen', function() {
                        var btn = document.getElementById('add-to-route');
                        btn.onclick = null; 
                        var index;
                        var latlngStr = latlng.lat + ',' + latlng.lng;
                        if(addedPoints.includes(latlngStr)){
                            btn.textContent = 'Usuń z trasy';
                            for (var i = 0; i < waypoints.length; i++){
                                if(waypoints[i].latLng.lat == latlng.lat && waypoints[i].latLng.lng == latlng.lng){
                                    index = i;
                                }
                            }
                            btn.addEventListener('click', function() {
                                control.spliceWaypoints(index, 1);
                                addedPoints.splice(addedPoints.indexOf(latlngStr), 1);
                                marker.closePopup();
                            });
                        } 
                        else {
                            btn.addEventListener('click', function() {
                                var minDist = Infinity;
                                var closestWaypointIndex;
                                var newWaypoint = L.latLng(latlng.lat, latlng.lng);
                                for (var i = 0; i < waypoints.length; i++){
                                    var dist = waypoints[i].latLng.distanceTo(newWaypoint);
                                    if(dist < minDist){
                                        minDist = dist;
                                        closestWaypointIndex = i;
                                    }
                                }
                                control.spliceWaypoints(closestWaypointIndex, 0, newWaypoint);
                                addedPoints.push(latlngStr);
                                marker.closePopup();
                            });
                        }
                    });
                    return marker;
                    }
                }).addTo(mymap);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error(textStatus, errorThrown);
        }
    });
}});

}
$('input[type=radio][name=options]').change(function() {
    if (this.id == 'option1') {
        document.getElementById('form1').style.display = 'block';
        document.getElementById('form2').style.display = 'none';
    }
    else if (this.id == 'option2') {
        document.getElementById('form1').style.display = 'none';
        document.getElementById('form2').style.display = 'block';
    }
});
$('#form1').on('submit', function(e) {
  e.preventDefault();

  var start = $('#search').val();
  var end = $('#search2').val();

  $.when(geocode(start), geocode(end)).done(function(startCoords, endCoords) {
      if (startCoords && endCoords) {
          console.log('Start coordinates:', startCoords);
          console.log('End coordinates:', endCoords);
          drawRoute(startCoords, endCoords);
      } else {
          console.log('Could not geocode the start and/or end address');
      }
  });

});

var legend = L.control({position: 'bottomleft'});

legend.onAdd = function (map) {

    var div = L.DomUtil.create('div', 'info legend'),
        categories = ['camp_site', 'theme_park', 'attraction', 'viewpoint', 'zoo', 'museum'],
        labels = ['Pole Kempingowe', 'Park Rozrywki', 'Atrakcja Turystyczna', 'Punkt Widokowy', 'Zoo', 'Muzeum'],
        icons = [campSiteIcon, themeParkIcon, attractionIcon, viewpointIcon, zooIcon, museumIcon];

    div.innerHTML = '<h4>Legenda</h4>';

    for (var i = 0; i < categories.length; i++) {
        div.innerHTML +=
            '<div><span style="display:inline-block; width: 30px; text-align: center;">' + icons[i].options.html + '</span> ' +
            labels[i] + '</div>';
    }

    return div;
};

legend.addTo(mymap);
radius1=0;
$('#myRange2').on('input', function() {
    radius = $(this).val();
    $('#demo2').text(radius);
});
$('#okButton2').on('click', function(e) {
    e.preventDefault();
    $('.dropdown-content').hide();
});


$('#form2').on('submit', function(e) {
    e.preventDefault();
    var address = $('#search3').val();
    var radius = $('#myRange2').val();

    searchAttractions(address, radius);
    
});
function searchAttractions(address, radius) {
    markers.clearLayers();
    addedPoints = [];
    var startcoord;
    addedPoints=[];
    control1=null;
    if (control) {
        mymap.removeControl(control);
        mymap.removeLayer(control);
        control = null;
    }
    geocode(address).then(function(coords) {
        if (coords) {
            radius1=Number(radius);
            startcoord=coords;
            var buffer = turf.buffer(turf.point(coords), radius1, {units:'kilometers'});
            var bbox = turf.bbox(buffer);
            var overpassQuery = `
                [out:json][timeout:25];
                (
                    node["tourism"="camp_site"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
                    node["tourism"="theme_park"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
                    node["tourism"="attraction"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
                    node["tourism"="viewpoint"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
                    node["tourism"="zoo"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
                    node["tourism"="museum"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
                );
                out body 400;
                >;
                out skel qt;
            `;

        $.ajax({
        url: "https://overpass-api.de/api/interpreter",
        type: "GET",
        data: { "data": overpassQuery },
        success: function(data) {
            var geojsonData = osmtogeojson(data);
            geojsonData.features = geojsonData.features.filter(function(feature) {
                return turf.inside(feature, buffer);
            });
            L.geoJSON(geojsonData, {
                pointToLayer: function(feature, latlng) {
                    var icon;
                    var popupContent = feature.properties.name 
                    ? "<b>" + feature.properties.name.replace('_', ' ') + "</b>" 
                    : "<b>" + feature.properties.tourism.replace('_', ' ')+"</b>";
                    popupContent +='<br><button id="add-to-route1">Dodaj do swojej trasy</button>';
                    switch (feature.properties.tourism) {
                        case 'camp_site':
                            icon = campSiteIcon;
                            break;
                        case 'theme_park':
                            icon = themeParkIcon;
                            break;
                        case 'attraction':
                            icon = attractionIcon;
                            break;
                        case 'viewpoint':
                            icon = viewpointIcon;
                            break;
                        case 'zoo':
                            icon = zooIcon;
                            break;
                        case 'museum':
                            icon = museumIcon;
                            break;
                    }
                    
                    var marker = L.marker(latlng, {icon: icon}).bindPopup(popupContent).addTo(markers);
    
    startCoord = L.latLng(startcoord[1], startcoord[0]);
    var waypoints = [];
    waypoints.push(startCoord);
    marker.on('popupopen', function() {
        var btn = document.getElementById('add-to-route1');
        btn.onclick = null;
        var index; 

        var latlngStr = latlng.lat + ',' + latlng.lng;
        if(addedPoints.includes(latlngStr)){
            btn.textContent='Usuń z trasy';
            for(var i=0;i<waypoints.length;i++){
                if(waypoints[i].latLng && waypoints[i].latLng.lat==latlng.lat && waypoints[i].latLng.lng==latlng.lng){
                    index=i;
                }
            }
            btn.addEventListener('click', function() {
                control1.spliceWaypoints(index, 1);
                addedPoints.splice(addedPoints.indexOf(latlngStr), 1);
                if (waypoints.length == 1) {
                    mymap.removeControl(control1);
                    control1 = null;
                    

                }
                marker.closePopup();
            });
        }
        else{
            btn.addEventListener('click', function() {
                var newWaypoint = L.latLng(latlng.lat, latlng.lng);
                control1=L.Routing.control({
                    waypoints: [startCoord, newWaypoint],
                    routeWhileDragging: false,
                    show: false
                }).addTo(mymap);
                waypoints.push(newWaypoint);
                addedPoints.push(latlngStr);
                marker.closePopup();

                
            });
        }
    });
    return marker;
                                                }
                            }).addTo(mymap); 
                            var group = L.featureGroup(markers.getLayers());
                            if (group.getLayers().length != 0) {
                                mymap.fitBounds(group.getBounds());
                            }
                        } 
                    });
                }
            });
        }

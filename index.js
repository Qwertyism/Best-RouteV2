const MAP_KEY = "AIzaSyC873DyHcGuy0EQDvCLHQGbZsnIQp-nifI";

let end = {};
let start = {};
let waypoints = [];

let map;
let geocoder;
let markers = [];
let directionsService;
let directionsRenderer;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 39.3071254400342, lng: -96.49056091082392 },
    zoom: 5,
  });

  addEventListener('load', function () {
    new google.maps.places.SearchBox(document.getElementById('location-input'));
  });

  geocoder = new google.maps.Geocoder();
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();
  directionsRenderer.setMap(map)
}

async function addPoint() {
  const address = document.getElementById("location-input").value || null
  if (address === null) { alert("Please enter an address"); return; }

  const radioButtons = document.querySelectorAll('input[name="point-type"]');
  let chosenType = null;

  radioButtons.forEach((button) => {
    if (button.checked) {
      if (button.value != "Waypoint") {
        button.disabled = true;
      }
      chosenType = button.value;
      button.checked = false;
      const a = document.getElementById("location-input")
      a.value = "";
    }
  });

  if (chosenType === null) { alert("Please select a point type"); return; }

  let place;

  try {
    await geocoder.geocode({ address: address }, function (results, status) {
      if (status === google.maps.GeocoderStatus.OK) {
        place = results[0];
      }
    });
  } catch (error) {
    alert("Unable to find address")
    return;
  }

  const marker = new google.maps.Marker({ position: place.geometry.location, map: map });
  map.setCenter(marker.getPosition());
  map.setZoom(13);
  markers.push(marker);

  if (chosenType === "Start") {
    start.address = address;
    start.id = place.place_id;
    const text = document.getElementById("start-text");
    text.innerHTML = "<p1>Start: " + address; + "</p1>";
    const b = document.getElementById("remove-button-start");
    b.value = `${address}`;
    b.hidden = false;
  }

  if (chosenType === "End") {
    end.address = address;
    end.id = place.place_id;
    const text = document.getElementById("end-text");
    text.innerHTML = "<p1>End: " + address + "</p1>";
    const b = document.getElementById("remove-button-end");
    b.value = `${address}`;
    b.hidden = false;
  }

  if (chosenType === "Waypoint") {
    waypoints.push({ address: address, id: place.place_id });
    let newText = `<br>Stop ${waypoints.length}: ${address}`;

    const waypointsText = document.getElementById("waypoint-table");
    waypointsText.innerHTML += `<tb id=${place.place_id} name=entry>` + newText + "</tb>";

    const parent = document.getElementById(place.place_id);
    const button = document.createElement("button");
    button.appendChild(document.createTextNode("Remove"));
    button.setAttribute("name", "remove-button-waypoint");
    button.setAttribute("value", `${address}`);
    button.setAttribute("onclick", "removePoint(this.value, \'Waypoint\')");
    parent.appendChild(button);
  }
  const b = document.getElementById("submit");
  b.hidden = false;
}

async function removePoint(value, type) {
  let place;
  await geocoder.geocode({ address: value }, function (results, status) {
    if (status === google.maps.GeocoderStatus.OK) {
      place = results[0];
    }
  });

  if (type === "Start") {
    const text = document.getElementById("start-text");
    text.innerHTML = "";
    const b = document.getElementById("remove-button-start");
    b.hidden = true;

    start.address = null;
    start.id = null;
  }
  if (type === "End") {
    const text = document.getElementById("end-text");
    text.innerHTML = "";
    const b = document.getElementById("remove-button-end");
    b.hidden = true;
    end.address = null;
    end.id = null;
  }
  if (type === "Waypoint") {
    const entries = document.getElementsByName("entry");
    entries.forEach((e) => {
      if (e.id === place.place_id) {
        e.innerHTML = "";
      }
    });

    for (let i = 0; i < waypoints.length; i++) {
      if (waypoints[i].id === place.place_id) {
        waypoints.splice(i, 1);
        break;
      }
    }
  }

  const radioButtons = document.querySelectorAll('input[name="point-type"]');
  radioButtons.forEach((button) => {
    if (button.value == type) {
      button.disabled = false;
    }
  });

  for (let i = 0; i < markers.length; i++) {
    let marker = markers[i];
    if (marker.position.lat() === place.geometry.location.lat() && marker.position.lng() === place.geometry.location.lng()) {
      marker.setMap(null);
      markers.splice(i, 1);
      if (markers.length != 0) { map.setCenter(markers[0].getPosition()); return; }
      map.setCenter({ lat: 39.3071254400342, lng: -96.49056091082392 });
      map.setZoom(5);
      return;
    }
  }
}

async function getDirections() {
  if (start.address === null) { alert("Please select a start point"); return; }
  if (end.address === null) { alert("Please select an end point"); return; }
  if (waypoints.length === 0) { alert("Please select at least one waypoint"); return; }

  let url = "https://maps.googleapis.com/maps/api/directions/json?";
  url += "origin=place_id:" + start.id;
  url += "&destination=place_id:" + end.id;
  url += "&waypoints=optimize:true";

  waypoints.forEach((waypoint) => {
    url += "|place_id:" + waypoint.id;
  });

  url += `&key=${MAP_KEY}`
  const waypts = []
  waypoints.forEach((waypoint) => {
    waypts.push({ location: waypoint.address, stopover: true })
  });

  let res;

  await directionsService
    .route({
      origin: start.address,
      destination: end.address,
      waypoints: waypts,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING,
    })
    .then((response) => {
      directionsRenderer.setDirections(response);
      res = response;
    })
    .catch((error) => { 
      alert("Failed to get directions");
    });


  const legs = res.routes[0].legs;
  let time = 0;
  let distance = 0;
  legs.forEach((leg) => { time += leg.duration.value; distance += leg.distance.value; });
  time /= 60;
  distance /= 1609.344;
  const disttime = document.getElementById("distance+time");
  disttime.innerHTML = `<p1>Distance: ${distance.toFixed(1)} miles</p1><br><p1>Time: ${time.toFixed(1)} minutes</p1>`;
}

window.initMap = initMap;

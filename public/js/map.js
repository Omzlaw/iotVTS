const socket = io();

function myMap() {
  let mapProp = {
    center: new google.maps.LatLng(9.052482, 7.455469),
    zoom: 16
  }

  let map = new google.maps.Map(document.getElementById('map'),
    mapProp)

  let marker = new google.maps.Marker({
    position: mapProp.center,
    icon: '/images/car.png'
  })
  marker.setMap(map)

  socket.on("map", function(data){
    let pos = {
      lat: parseFloat(data[0]),
      lng: parseFloat(data[1])
    };
    marker.setPosition(pos);
    map.setCenter(pos);
  });
}

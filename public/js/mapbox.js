/* eslint-disable */

export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoidGVhY2hjcmF3bGVyIiwiYSI6ImNrZTl6aTdqNTA3b2Eyc3QwMjBoYTZuZmIifQ.rGVDxxPFKGw0AOFVRq6Drw';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/teachcrawler/ckeb9t99d11wz1anv1ugyadbz',
    scrollZoom: false,
    // center: [78.003537, 30.310459],
    // zoom: 10,
    // interactive: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';
    // Add Marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // set popup

    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`Day ${loc.day}: ${loc.description}`)
      .addTo(map);
    // Extends the map bound to current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 200,
      left: 100,
      right: 100,
    },
  });
};

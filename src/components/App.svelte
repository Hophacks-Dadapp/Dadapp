<script>
    import {onMount} from 'svelte';
    import {Loader} from '@googlemaps/js-api-loader';

    let map;
    let drawingManager;
    let drawingMode = 'boundary'; // To track whether we are drawing the boundary or a no-step zone
    let address = '';
    let message = "Use the button below to start drawing the lawn boundary.";
    let boundaryPolygon; // Store the lawn boundary polygon
    let boundaryCoordinates = []; // To store X, Y coordinates of the lawn boundary
    let noStepZones = []; // To store the X, Y coordinates of no-step zones
    let noStepZonePolygons = []; // To store the drawn polygons for no-step zones
    let lawnBoundaryDrawn = false; // Track if the lawn boundary has been drawn
    let boundaryBounds; // To store the boundary bounding box

    // Conversion factor from degrees to meters (approximate near the equator)
    const metersPerDegreeLat = 111320; // 1 degree of latitude = ~111.32 km or ~111,320 meters
    const metersPerDegreeLng = 111320; // This is approximate and varies depending on latitude

    // Initialize Google Maps loader with your API key
    const loader = new Loader({
        apiKey: 'AIzaSyDuDeowNpEBV4X_4VYjcdRlXbiaMsg2B-E\n', // Replace with your actual API key
        version: 'weekly',
        libraries: ['drawing', 'geometry', 'places'] // Load the necessary libraries
    });

    onMount(async () => {
        try {
            // Wait for Google Maps API to load
            await loader.load();

            // Access google via window.google after loading
            const google = window.google;

            // Once loaded, initialize the map
            map = new google.maps.Map(document.getElementById('map'), {
                center: {lat: 37.7749, lng: -122.4194}, // Default center (San Francisco)
                zoom: 18,
                mapTypeId: google.maps.MapTypeId.SATELLITE // Initial map type set to Satellite view
            });

            // Check if drawing library is available
            const drawingLibrary = google.maps.drawing;
            if (drawingLibrary) {
                // Initialize the Drawing Manager without a default drawing mode
                drawingManager = new drawingLibrary.DrawingManager({
                    map: map,
                    drawingControl: false, // Disable drawing toolbar
                    polygonOptions: getPolygonOptions('boundary')
                });

                // Add event listener for overlay completion (when a polygon is drawn)
                google.maps.event.addListener(drawingManager, 'overlaycomplete', (event) => {
                    const polygon = event.overlay;

                    if (event.type === google.maps.drawing.OverlayType.POLYGON) {
                        if (drawingMode === 'boundary') {
                            message = "Lawn boundary drawn! Now you can draw no-step zones.";
                            lawnBoundaryDrawn = true; // Set flag to indicate lawn boundary is drawn
                            boundaryPolygon = polygon; // Store the boundary polygon for future use

                            // Get the boundary's bounding box
                            boundaryBounds = new google.maps.LatLngBounds();
                            polygon.getPath().forEach(point => boundaryBounds.extend(point));

                            const boundaryPolygonCoordinates = polygon.getPath().getArray().map(point => ({
                                lat: point.lat(),
                                lng: point.lng()
                            }));

                            // Convert to X, Y based on the bounding box and store
                            convertLatLngToXY(boundaryPolygonCoordinates, 'boundary');
                        } else if (drawingMode === 'no-step') {
                            // Ensure the no-step zone is within the boundary polygon
                            if (boundaryPolygon && !isNoStepZoneValid(polygon, boundaryPolygon)) {
                                message = "No-step zone must be within the lawn boundary!";
                                polygon.setMap(null); // Remove invalid polygon
                                return;
                            }

                            message = "No-step zone drawn!";
                            noStepZonePolygons.push(polygon); // Store the no-step polygon for future clearing

                            const noStepPolygonCoordinates = polygon.getPath().getArray().map(point => ({
                                lat: point.lat(),
                                lng: point.lng()
                            }));

                            // Convert to X, Y based on the lawn boundary's grid and store
                            convertLatLngToXY(noStepPolygonCoordinates, 'no-step');
                        }

                        // Set the polygon style again based on drawing mode
                        polygon.setOptions(getPolygonOptions(drawingMode));
                    }
                });
            } else {
                console.error('Google Maps Drawing Library not loaded.');
            }
        } catch (error) {
            console.error('Error loading Google Maps:', error);
        }
    });

    // Function to check if no-step zone is within the boundary polygon
    function isNoStepZoneValid(noStepPolygon, boundaryPolygon) {
        const google = window.google;
        const path = noStepPolygon.getPath();

        for (let i = 0; i < path.getLength(); i++) {
            const point = path.getAt(i);

            // Check if the point is inside the boundary polygon
            if (!google.maps.geometry.poly.containsLocation(point, boundaryPolygon)) {
                return false; // Point is outside the boundary
            }
        }
        return true; // All points are inside the boundary
    }

    // Function to get polygon options based on drawing mode
    function getPolygonOptions(type) {
        if (type === 'boundary') {
            return {
                editable: true,
                strokeColor: '#FF0000',  // Red color for boundary
                fillColor: '#FFCCCC',    // Light red for boundary
                fillOpacity: 0.5,        // Semi-transparent
                strokeOpacity: 0.8,
                strokeWeight: 2
            };
        } else if (type === 'no-step') {
            return {
                editable: true,
                strokeColor: '#808080',  // Gray color for no-step
                fillColor: '#D3D3D3',    // Light gray for no-step
                fillOpacity: 0.5,        // Semi-transparent
                strokeOpacity: 0.8,
                strokeWeight: 2
            };
        }
    }

    // Function to convert latitude and longitude into relative X, Y coordinates based on boundary bounds
    function convertLatLngToXY(coordinates, type) {
        if (coordinates.length === 0 || !boundaryBounds) return;

        const minLat = boundaryBounds.getSouthWest().lat();
        const minLng = boundaryBounds.getSouthWest().lng();

        const maxLat = boundaryBounds.getNorthEast().lat();
        const maxLng = boundaryBounds.getNorthEast().lng();

        const width = (maxLng - minLng) * metersPerDegreeLng;
        const height = (maxLat - minLat) * metersPerDegreeLat;

        const convertedCoordinates = coordinates.map(point => ({
            x: ((point.lng - minLng) / (maxLng - minLng)) * width, // Normalize and scale to boundary width
            y: ((point.lat - minLat) / (maxLat - minLat)) * height // Normalize and scale to boundary height
        }));

        if (type === 'boundary') {
            boundaryCoordinates = convertedCoordinates;
        } else if (type === 'no-step') {
            noStepZones = [...noStepZones, convertedCoordinates];
        }
    }

    // Function to toggle between boundary and no-step zone drawing modes
    function toggleDrawingMode(mode) {
        const google = window.google;
        drawingMode = mode;
        drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
        if (mode === 'boundary') {
            message = "Draw the boundary of the lawn.";
        } else if (mode === 'no-step') {
            message = "Draw a no-step zone inside the boundary.";
        }
    }

    // Function to clear all polygons (boundary and no-step zones) and reset state
    function clearAllPolygons() {
        // Clear the boundary polygon
        if (boundaryPolygon) {
            boundaryPolygon.setMap(null);
            boundaryPolygon = null;
        }

        // Clear all no-step polygons
        noStepZonePolygons.forEach(polygon => polygon.setMap(null));
        noStepZonePolygons = [];

        // Reset state variables
        boundaryCoordinates = [];
        noStepZones = [];
        lawnBoundaryDrawn = false;
        message = "Use the button below to start drawing the lawn boundary.";
    }

    async function geocodeAddress() {
        const google = window.google;
        const geocoder = new google.maps.Geocoder();

        if (address) {
            try {
                geocoder.geocode({address: address}, (results, status) => {
                    if (status === google.maps.GeocoderStatus.OK && results) {
                        const location = results[0].geometry.location;
                        map.setCenter(location); // Center the map on the geocoded location
                        map.setMapTypeId(google.maps.MapTypeId.SATELLITE); // Switch to satellite view
                        map.setZoom(20); // Max zoom level for close-up
                    } else {
                        console.error('Geocode was not successful for the following reason: ' + status);
                    }
                });
            } catch (error) {
                console.error('Error during geocoding:', error);
            }
        } else {
            console.error('Address is empty.');
        }
    }
</script>

<!-- Input to go to a specific address -->
<div>
    <input type="text" bind:value={address} placeholder="Enter address"/>
    <button on:click={geocodeAddress}>Go to Address</button>
</div>

<!-- Buttons to toggle drawing modes -->
<div>
    <button on:click={() => toggleDrawingMode('boundary')}>Draw Lawn Boundary</button>
    <button on:click={() => toggleDrawingMode('no-step')} disabled={!lawnBoundaryDrawn}>Draw No-Step Zone</button>
    <button on:click={clearAllPolygons}>Clear All</button>
</div>

<!-- Map display -->
<div id="map" style="height: 400px; width: 100%;"></div>

<!-- Instructions for the user -->
<div>
    <p>{message}</p>
</div>

<!-- Display X, Y coordinates -->
<div>
    <h3>Lawn Boundary (X, Y Coordinates):</h3>
    {#each boundaryCoordinates as coordinate}
        <p>X: {coordinate.x.toFixed(2)}, Y: {coordinate.y.toFixed(2)}</p>
    {/each}

    <h3>No-Step Zones (X, Y Coordinates):</h3>
    {#each noStepZones as zone}
        <h4>No-Step Zone:</h4>
        {#each zone as coordinate}
            <p>X: {coordinate.x.toFixed(2)}, Y: {coordinate.y.toFixed(2)}</p>
        {/each}
    {/each}
</div>

<style>
    #map {
        height: 400px;
        width: 100%;
    }
</style>

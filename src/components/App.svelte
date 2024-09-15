<script>
    import { onMount } from 'svelte';
    import { Loader } from '@googlemaps/js-api-loader';
    import Title from './title.svelte';

    let map;
    let drawingManager;
    let drawingMode = 'boundary'; // 'boundary' or 'no-step'
    let address = '';
    let message = "Use the button below to start drawing the lawn boundary.";
    let boundaryPolygon;
    let boundaryCoordinates = []; // Store lat, lng of boundary
    let noStepZones = []; // Store lat, lng of no-step zones
    let noStepZonePolygons = [];
    let lawnBoundaryDrawn = false;
    let polylines = [];
    let mowingTimeText = ''; // Store the mowing time in words

    const mowerWidth = 0.00002; // Adjust this value for the mower's width in lat/lng
    const mowerSpeed = 1.4; // Average human walking speed pushing a mower in meters per second (m/s)

    const loader = new Loader({
        apiKey: import.meta.env.VITE_API_KEY,
        version: 'weekly',
        libraries: ['drawing', 'geometry', 'places']
    });

    onMount(async () => {
        try {
            await loader.load();
            const google = window.google;

            map = new google.maps.Map(document.getElementById('map'), {
                center: { lat: 37.7749, lng: -122.4194 },
                zoom: 18,
                mapTypeId: google.maps.MapTypeId.SATELLITE
            });

            drawingManager = new google.maps.drawing.DrawingManager({
                map: map,
                drawingControl: false,
                polygonOptions: getPolygonOptions('boundary')
            });

            google.maps.event.addListener(drawingManager, 'overlaycomplete', (event) => {
                const polygon = event.overlay;

                if (event.type === google.maps.drawing.OverlayType.POLYGON) {
                    if (drawingMode === 'boundary') {
                        lawnBoundaryDrawn = true;
                        boundaryPolygon = polygon;

                        boundaryCoordinates = polygon.getPath().getArray().map(point => ({
                            lat: point.lat(),
                            lng: point.lng()
                        }));

                        if (boundaryCoordinates.length < 3) {
                            console.error("Boundary is not valid, it needs at least 3 points.");
                        }
                    } else if (drawingMode === 'no-step') {
                        if (boundaryPolygon && !isNoStepZoneValid(polygon, boundaryPolygon)) {
                            polygon.setMap(null);
                            return;
                        }

                        noStepZonePolygons.push(polygon);
                        const noStepPolygonCoordinates = polygon.getPath().getArray().map(point => ({
                            lat: point.lat(),
                            lng: point.lng()
                        }));

                        noStepZones = [...noStepZones, noStepPolygonCoordinates];
                    }

                    polygon.setOptions(getPolygonOptions(drawingMode));
                }
            });
        } catch (error) {
            console.error('Error loading Google Maps:', error);
        }
    });

    function toggleDrawingMode(mode) {
        const google = window.google;
        drawingMode = mode;

        if (drawingManager) {
            drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
        }

        if (mode === 'boundary') {
            message = "Draw the boundary of the lawn.";
        } else if (mode === 'no-step') {
            message = "Draw a no-step zone inside the boundary.";
        }
    }

    function isNoStepZoneValid(noStepPolygon, boundaryPolygon) {
        const google = window.google;
        const path = noStepPolygon.getPath();

        for (let i = 0; i < path.getLength(); i++) {
            const point = path.getAt(i);
            if (!google.maps.geometry.poly.containsLocation(point, boundaryPolygon)) {
                return false;
            }
        }
        return true;
    }

    function getPolygonOptions(type) {
        if (type === 'boundary') {
            return {
                editable: true,
                strokeColor: '#FF0000',
                fillColor: '#FFCCCC',
                fillOpacity: 0.5,
                strokeOpacity: 0.8,
                strokeWeight: 2
            };
        } else if (type === 'no-step') {
            return {
                editable: true,
                strokeColor: '#808080',
                fillColor: '#D3D3D3',
                fillOpacity: 0.5,
                strokeOpacity: 0.8,
                strokeWeight: 2
            };
        }
    }

    function clearAllPolygons() {
        if (boundaryPolygon) {
            boundaryPolygon.setMap(null);
            boundaryPolygon = null;
        }

        noStepZonePolygons.forEach(polygon => polygon.setMap(null));
        noStepZonePolygons = [];
        boundaryCoordinates = [];
        noStepZones = [];
        lawnBoundaryDrawn = false;
        message = "Use the button below to start drawing the lawn boundary.";

        polylines.forEach(polyline => polyline.setMap(null));
        polylines = [];

        mowingTimeText = '';
    }

    function generateGrid(boundaryPolygon, noStepPolygons) {
        const google = window.google;
        const path = boundaryPolygon.getPath();
        const grid = [];

        let bounds = {
            minLat: Number.POSITIVE_INFINITY,
            maxLat: Number.NEGATIVE_INFINITY,
            minLng: Number.POSITIVE_INFINITY,
            maxLng: Number.NEGATIVE_INFINITY
        };

        path.forEach(point => {
            const lat = point.lat();
            const lng = point.lng();

            if (lat < bounds.minLat) bounds.minLat = lat;
            if (lat > bounds.maxLat) bounds.maxLat = lat;
            if (lng < bounds.minLng) bounds.minLng = lng;
            if (lng > bounds.maxLng) bounds.maxLng = lng;
        });

        for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += mowerWidth) {
            for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += mowerWidth) {
                const point = new google.maps.LatLng(lat, lng);

                if (google.maps.geometry.poly.containsLocation(point, boundaryPolygon)) {
                    let isInsideNoStep = false;
                    for (const noStepPolygon of noStepPolygons) {
                        if (google.maps.geometry.poly.containsLocation(point, noStepPolygon)) {
                            isInsideNoStep = true;
                            break;
                        }
                    }

                    if (!isInsideNoStep) {
                        grid.push({ lat, lng });
                    }
                }
            }
        }

        if (grid.length === 0) {
            console.error("Grid generation failed, no points inside the boundary.");
        }

        return grid;
    }



    // Calculate mowing time based on distance and mower speed
    function drawMowingPath() {
        if (!boundaryPolygon) {
            console.error("Boundary or no-step zones not defined.");
            return;
        }

        const google = window.google;

        // Generate a valid grid inside the lawn boundaries and outside no-step zones
        const grid = generateGrid(boundaryPolygon, noStepZonePolygons);
        if (grid.length === 0) {
            console.error("No valid grid generated.");
            return;
        }

        // Start from the southwest corner (smallest lat and lng)
        let startPoint = grid.reduce((min, point) => (point.lat < min.lat || (point.lat === min.lat && point.lng < min.lng)) ? point : min, grid[0]);

        let mowingPath = [startPoint]; // Begin with the southwest corner
        let visited = new Set([`${startPoint.lat},${startPoint.lng}`]); // To track visited points
        let current = startPoint;
        let direction = 1; // 1 = right, -1 = left

        // Continue mowing until all points are visited
        while (mowingPath.length < grid.length) {
            let nextRow = grid.filter(p => p.lat === current.lat && !visited.has(`${p.lat},${p.lng}`));
            nextRow = direction === 1 ? nextRow.sort((a, b) => a.lng - b.lng) : nextRow.sort((a, b) => b.lng - a.lng);

            if (nextRow.length > 0) {
                current = nextRow[0];

                // Avoid no-step zones
                if (!isPointInNoStepZone(current)) {
                    mowingPath.push(current);
                    visited.add(`${current.lat},${current.lng}`);
                } else {
                    // Reroute using A* when hitting a no-step zone
                    const pathAround = aStar(grid, current, findNextValidPoint(grid, visited, current, direction));
                    if (pathAround.length > 0) {
                        mowingPath = mowingPath.concat(pathAround);
                        current = pathAround[pathAround.length - 1];
                        visited.add(`${current.lat},${current.lng}`);
                    } else {
                        break; // No path around, stop
                    }
                }
            } else {
                let nextPoint = grid.find(p => p.lat > current.lat && !visited.has(`${p.lat},${p.lng}`));
                if (nextPoint) {
                    current = nextPoint;
                    mowingPath.push(current);
                    visited.add(`${current.lat},${current.lng}`);
                    direction *= -1; // Switch direction
                } else {
                    break; // All points covered
                }
            }
        }

        const latLngPath = mowingPath.map(node => new google.maps.LatLng(node.lat, node.lng));

        // Clear previous paths and draw the updated path
        polylines.forEach(polyline => polyline.setMap(null));
        polylines = [];

        const polyline = new google.maps.Polyline({
            path: latLngPath,
            strokeColor: '#0000FF',
            strokeOpacity: 1.0,
            strokeWeight: 3,
            map: map
        });
        polylines.push(polyline);

        // Calculate total distance and mowing time
        const totalDistance = calculateTotalDistance(mowingPath); // Distance in meters
        const algorithmFactor = noStepZones.length > 0 ? 1.3 : 1; // Increase time by 30% if avoiding no-step zones
        const boundarySizeFactor = boundaryCoordinates.length > 10 ? 1.2 : 1; // Adjust time based on boundary size
        const mowingTimeMinutes = Math.round((totalDistance / mowerSpeed / 60) * algorithmFactor * boundarySizeFactor);

        // Ensure that the time is not zero, by setting a minimum threshold
        mowingTimeText = mowingTimeMinutes > 0 ? formatTimeAsText(mowingTimeMinutes) : "Less than a minute";
    }

    function calculateHeuristic(pointA, pointB) {
        const dx = pointB.lat - pointA.lat;
        const dy = pointB.lng - pointA.lng;
        return Math.sqrt(dx * dx + dy * dy); // Euclidean distance
    }

    function aStar(grid, startPoint, endPoint) {
        const openSet = [startPoint];
        const closedSet = [];

        startPoint.gCost = 0;
        startPoint.hCost = calculateHeuristic(startPoint, endPoint);
        startPoint.fCost = startPoint.gCost + startPoint.hCost;

        while (openSet.length > 0) {
            let currentNode = openSet.reduce((prev, curr) => (prev.fCost < curr.fCost) ? prev : curr);

            if (currentNode === endPoint) {
                let path = [];
                let temp = currentNode;
                while (temp) {
                    path.push(temp);
                    temp = temp.previous;
                }
                return path.reverse(); // Return path from start to goal
            }

            openSet.splice(openSet.indexOf(currentNode), 1);
            closedSet.push(currentNode);

            const neighbors = getNeighbors(grid, currentNode);
            for (let neighbor of neighbors) {
                if (closedSet.includes(neighbor) || isPointInNoStepZone(neighbor)) continue;

                const tentativeGCost = currentNode.gCost + calculateHeuristic(currentNode, neighbor);

                if (tentativeGCost < neighbor.gCost || !openSet.includes(neighbor)) {
                    neighbor.gCost = tentativeGCost;
                    neighbor.hCost = calculateHeuristic(neighbor, endPoint);
                    neighbor.fCost = neighbor.gCost + neighbor.hCost;
                    neighbor.previous = currentNode;

                    if (!openSet.includes(neighbor)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        return []; // No path found
    }

    function getNeighbors(grid, point) {
        const neighbors = [];
        const directions = [
            { lat: mowerWidth, lng: 0 },   // North
            { lat: -mowerWidth, lng: 0 },  // South
            { lat: 0, lng: mowerWidth },   // East
            { lat: 0, lng: -mowerWidth }   // West
        ];

        for (let dir of directions) {
            const neighborLat = point.lat + dir.lat;
            const neighborLng = point.lng + dir.lng;
            const neighbor = grid.find(p => p.lat === neighborLat && p.lng === neighborLng);
            if (neighbor) {
                neighbors.push(neighbor);
            }
        }

        return neighbors;
    }

    function isPointInNoStepZone(point) {
        const google = window.google;
        return noStepZonePolygons.some(noStepPolygon =>
            google.maps.geometry.poly.containsLocation(new google.maps.LatLng(point.lat, point.lng), noStepPolygon)
        );
    }

    function findNextValidPoint(grid, visited, current, direction) {
        return grid.find(p => !visited.has(`${p.lat},${p.lng}`) && p.lat > current.lat);
    }

    function calculateTotalDistance(pathPoints) {
        let totalDistance = 0;
        for (let i = 0; i < pathPoints.length - 1; i++) {
            const startPoint = new google.maps.LatLng(pathPoints[i].lat, pathPoints[i].lng);
            const endPoint = new google.maps.LatLng(pathPoints[i + 1].lat, pathPoints[i + 1].lng);
            const distance = google.maps.geometry.spherical.computeDistanceBetween(startPoint, endPoint); // Distance in meters
            totalDistance += distance;
        }
        return totalDistance; // Distance in meters
    }

    function formatTimeAsText(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} and ${mins} minute${mins !== 1 ? 's' : ''}`;
        } else {
            return `${mins} minute${mins !== 1 ? 's' : ''}`;
        }
    }

    function geocodeAddress() {
        const google = window.google;
        const geocoder = new google.maps.Geocoder();

        if (address) {
            geocoder.geocode({address: address}, (results, status) => {
                if (status === google.maps.GeocoderStatus.OK && results) {
                    const location = results[0].geometry.location;
                    map.setCenter(location);
                    map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
                    map.setZoom(20);
                } else {
                    console.error('Geocode was not successful for the following reason: ' + status);
                }
            });
        } else {
            console.error('Address is empty.');
        }
    }
</script>

<Title/>
<div class="container">
    <div class="map-and-coordinates">
        <div id="map"></div>
        <div class="coordinates">
            <h3>Lawn Boundary (Latitude, Longitude):</h3>
            {#each boundaryCoordinates as coordinate}
                <p>Lat: {coordinate.lat.toFixed(6)}, Lng: {coordinate.lng.toFixed(6)}</p>
            {/each}

            <h3>No-Step Zones (Latitude, Longitude):</h3>
            {#each noStepZones as zone}
                <h4>No-Step Zone:</h4>
                {#each zone as coordinate}
                    <p>Lat: {coordinate.lat.toFixed(6)}, Lng: {coordinate.lng.toFixed(6)}</p>
                {/each}
            {/each}

            <h3>Estimated Mowing Time:</h3>
            <p>{mowingTimeText}</p>
        </div>
    </div>

    <div class="controls">
        <input type="text" bind:value={address} placeholder="Enter address" class="address-input"/>
        <button on:click={geocodeAddress} class="action-button">Go to Address</button>
    </div>

    <div class="drawing-controls">
        <button on:click={() => toggleDrawingMode('boundary')} class="action-button">Draw Lawn Boundary</button>
        <button on:click={() => toggleDrawingMode('no-step')} class="action-button" disabled={!lawnBoundaryDrawn}>Draw
            No-Step Zone
        </button>
        <button on:click={clearAllPolygons} class="action-button">Clear All</button>
    </div>

    <div class="path-controls">
        <button on:click={drawMowingPath} class="action-button" disabled={!lawnBoundaryDrawn}>Generate Mowing Path
        </button>
    </div>

    <div class="instructions">
        <p>{message}</p>
    </div>
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        gap: 20px;
        margin: 20px;
    }

    .map-and-coordinates {
        display: flex;
        justify-content: space-between;
        gap: 20px;
    }

    #map {
        height: 400px;
        width: 60%;
        border: 2px solid #ddd;
        border-radius: 8px;
    }

    .coordinates {
        width: 35%;
        text-align: left;
        padding: 10px;
        border: 2px solid #ddd;
        border-radius: 8px;
        background-color: #f9f9f9;
    }

    .controls, .drawing-controls, .path-controls {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: center;
    }

    .address-input {
        padding: 8px;
        font-size: 16px;
        border-radius: 4px;
        border: 1px solid #ccc;
    }

    .action-button {
        padding: 10px 15px;
        font-size: 16px;
        border-radius: 4px;
        border: 1px solid #007bff;
        background-color: #007bff;
        color: white;
        cursor: pointer;
    }

    .action-button:disabled {
        background-color: #ccc;
        border-color: #ccc;
        cursor: not-allowed;
    }

    .instructions {
        text-align: center;
    }
</style>

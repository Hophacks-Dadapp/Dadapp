<script lang=js>
    import { onMount } from 'svelte'
    import { Loader } from '@googlemaps/js-api-loader'
    
    const loader = new Loader({
        apiKey: "API_KEY_HERE",
        version: "weekly"
    });
      
    onMount(async () => {
        await loader.load()

        const { Map } = await google.maps.importLibrary("maps");
        
        map = new Map(document.getElementById("map"), {
            center: { lat: -34.397, lng: 150.644 },
            zoom: 8,
        });
    })
</script>


<div id="map"></div>

<style>
    #map {
        height: 400px;
        width: 100%;
    }
</style>
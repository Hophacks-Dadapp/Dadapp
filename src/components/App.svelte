<script lang=js>
    import { onMount } from 'svelte'
    import { Loader } from '@googlemaps/js-api-loader'
    import {getDadJokes} from "../js/getdadjokes.js";

    const loader = new Loader({
        apiKey: "API-KEY",
        version: "weekly"
    });

    let dadJokeBox
    onMount(async () => {
        await loader.load()
        const { Map } = await google.maps.importLibrary("maps");
        setInterval(async () => {dadJokeBox.innerText = await getDadJokes()},5000)
        const map = new Map(document.getElementById("map"), {
            center: { lat: -34.397, lng: 150.644 },
            zoom: 23,
        });
    })


</script>
<h2> Map </h2>

<div id="map"></div>

<h4> Dad joke </h4>
<p bind:this = {dadJokeBox}></p>

<style>
    #map {
        height: 400px;
        width: 100%;
    }
</style>
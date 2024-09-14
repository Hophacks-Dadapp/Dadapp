<script>
    import { onMount } from 'svelte'
    import { drawPolygon, perimeterPoints, getTSPPoints } from '../js/mesh.js'

    let canvas

    onMount(() => {
        let mowerWidth = 12
        drawPolygon(canvas, perimeterPoints, 'red')
        const points = getTSPPoints(perimeterPoints, mowerWidth)
        drawPolygon(canvas, points, 'gray')
    })
</script>

<canvas bind:this={canvas} width=600, height=400></canvas>

<style>
    canvas {
        width: 100%;
    }
</style>
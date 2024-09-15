<script>
    import { onMount } from 'svelte'
    import { drawPoints, perimeterPoints, getTSPPoints, drawPath, insetPoints } from '../js/mesh.js'
    import { findMinRoute } from '../js/tsp.js';

    let canvas

    onMount(() => {
        let mowerWidth = 20
        drawPoints(canvas, perimeterPoints, 'red')
        const points = getTSPPoints(perimeterPoints, mowerWidth)
        drawPoints(canvas, points, 'gray')

        drawPath(canvas, findMinRoute(points), mowerWidth, 'blue')
        drawPath(canvas, findMinRoute(points))
        
        drawPath(canvas, perimeterPoints)
    })
</script>

<canvas bind:this={canvas} width=1000, height=800></canvas>

<style>
    canvas {
        width: 100%;
    }
</style>
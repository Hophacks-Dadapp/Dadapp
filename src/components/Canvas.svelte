<script lang=js>
    import { onMount } from 'svelte'
    let thing
    let canvas

    onMount(() => {
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = 'rgb(100, 60, 32)'
        ctx.fillRect(20, 20, 50, 50)
    })
</script>

<div bind:this={thing}>
    <canvas bind:this={canvas} width=200 height=300></canvas>
</div>
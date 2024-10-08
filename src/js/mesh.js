import blueNoise from "../assets/bluenoise.json"
const bnPoints = blueNoise.points

const findInsetLine = (p1, p2, offsetWidth) => {
    const dx = (p2.x - p1.x), dy = (p2.y - p1.y)
    const m = dy / dx
    const norm = Math.sqrt(dx * dx + dy * dy)
    const scaleFactor = .5 * offsetWidth / norm
    const ox = p1.x - dy * scaleFactor
    const oy = p1.y + dx * scaleFactor
    return [ -m, 1, m * ox - oy ]
}

const insetPoints = (perimeterPoints, offsetWidth) => {
    const n = perimeterPoints.length
    let points = []
    for (let i = 0; i < n; i++) {
        const prev = perimeterPoints[(i + n - 1) % n]
        const point = perimeterPoints[i]
        const next = perimeterPoints[(i + 1) % n]

        const [a1, b1, c1] = findInsetLine(prev, point, offsetWidth)
        const [a2, b2, c2] = findInsetLine(point, next, offsetWidth)
        
        const denominator = a1 * b2 - a2 * b1

        const px = (b1 * c2 - b2 * c1) / denominator
        const py = (c1 * a2 - c2 * a1) / denominator
        points.push({ x: px, y: py })
    }
    return points
}

const getAABB = (poligonPoints) => {
    const xs = poligonPoints.map(p => p.x)
    const ys = poligonPoints.map(p => p.y)
    const [ minX, minY, maxX, maxY ] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

const intersectsPoint = (p, s1, s2) => {
    if (p.y < Math.min(s1.y, s2.y) || p.y > Math.max(s1.y, s2.y))
        return false
    const oneOverM = (s2.x - s1.x) / (s2.y - s1.y)
    return p.x >= s1.x + (p.y - s1.y) * oneOverM
}

const forEdges = (points, func) => {
    const n = points.length
    for (let i = 0; i < n; i++) {
        const thisPoint = points[i]
        const nextPoint = points[(i + 1) % n]
        func(thisPoint, nextPoint, n)
    }
}

const isInside = (interiorPoints, point) => {
    const n = interiorPoints.length
    let intersections = 0
    forEdges(interiorPoints, (p1, p2, _) => {
        if (intersectsPoint(point, p1, p2))
            intersections++
    })
    return intersections % 2 == 1
}

const interpolatePoints = (p1, p2, mowerWidth) => {
    const [dx, dy] = [p2.x - p1.x, p2.y - p1.y]
    const hyp = Math.sqrt(dx * dx + dy * dy)
    const [deltaX, deltaY] = [mowerWidth * dx / hyp, mowerWidth * dy / hyp]
    let points = []
    let x = 0, y = 0;
    for (let i = 0; i < hyp; i += mowerWidth) {
        points.push({ x: x + p1.x, y: y + p1.y })
        x += deltaX
        y += deltaY
    }
    return points
}

const interpolatePath = (polygonPoints, mowerWidth) => {
    let path = []
    forEdges(polygonPoints, (p1, p2) => {
        const interp = interpolatePoints(p1, p2, mowerWidth)
        path = path.concat(interp)
    })
    return path
}

export const getTSPPoints = (perimeterPoints, mowerWidth) => {
    const interior = insetPoints(perimeterPoints, mowerWidth)
    const bounding = getAABB(interior)
    const tileWidth = blueNoise.size * mowerWidth / blueNoise.maxDist
    const tileXCount = Math.ceil(bounding.width / tileWidth)
    const tileYCount = Math.ceil(bounding.height / tileWidth)

    let splatterPoints = []
    for (let x = 0; x < tileXCount; x++) {
        for (let y = 0; y < tileYCount; y++) {
            splatterPoints = splatterPoints.concat(
                bnPoints.map(p => {
                    return { x: p.x + blueNoise.size * x, y: p.y + blueNoise.size * y }
                })
            )
        }
    }

    splatterPoints = splatterPoints
        .map(p => { return { x: p.x * mowerWidth / blueNoise.maxDist, y: p.y * mowerWidth / blueNoise.maxDist} })
        .filter(p => p.x < bounding.width && p.y < bounding.height)
        .map(p => { return {x: p.x + bounding.x, y: p.y + bounding.y}})
        .filter(p => isInside(interior, p))

    return splatterPoints.concat(interpolatePath(interior, mowerWidth))
}

const drawCircle = (ctx, x, y, color = 'red', radius = 2) => {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false)
    ctx.fillStyle = color
    ctx.fill()
}

export const drawPoints = (canvasElement, polygonPoints, color = 'red') => {
    const ctx = canvasElement.getContext('2d')
    for (const point of polygonPoints) {
        drawCircle(ctx, point.x, point.y, color)
    }
}

export const drawPath = (canvasElement, points, lineWidth = 1, color = 'black') => {
    const ctx = canvasElement.getContext('2d')
    drawCircle(ctx, points[0].x, points[0].y, 'green')
    ctx.beginPath()
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = color
    ctx.lineCap = 'round'
    forEdges(points, (p1, p2) => {
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
    })
    ctx.stroke()
}

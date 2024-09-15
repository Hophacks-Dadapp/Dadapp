// Javascript program for the above approach

// Function to find the minimum
// cost path for all the paths
export const findMinRoute = (points, perimeterPoints) => {
    const tsp = genAdjacenty(points, perimeterPoints)

	let sum = 0;
	let counter = 0;
	let j = 0, i = 0;
	let min = Number.MAX_SAFE_INTEGER;
	let visitedRouteList = Array(tsp.length).fill(0);

	// Starting from the 0th indexed
	// city i.e., the first city
	visitedRouteList[0] = 1;
	let route = Array(tsp.length);

	// Traverse the adjacency
	// matrix tsp[][]
	while (i < tsp.length && j < tsp[i].length)
	{

		// Corner of the Matrix
		if (counter >= tsp[i].length - 1)
		{
			break;
		}

		// If this path is unvisited then
		// and if the cost is less then
		// update the cost
		if (j != i && (visitedRouteList[j] == 0))
		{
			if (tsp[i][j] < min)
			{
				min = tsp[i][j];
				route[counter] = j + 1;
			}
		}
		j++;

		// Check all paths from the
		// ith indexed city
		if (j == tsp[i].length)
		{
			sum += min;
			min = Number.MAX_SAFE_INTEGER;
			visitedRouteList[route[counter] - 1] = 1;
			j = 0;
			i = route[counter] - 1;
			counter++;
		}
	}

	// Update the ending city in array
	// from city which was last visited
	i = route[counter - 1] - 1;

	for (j = 0; j < tsp.length; j++)
	{

		if ((i != j) && tsp[i][j] < min)
		{
			min = tsp[i][j];
			route[counter] = j + 1;
		}
	}
	sum += min;

	// Started from the node where
	// we finished as well.

    let path = []
    for (const index of route)
        path.push(points[index - 1])
    return path
}
// This code is contributed by Pushpesh Raj.

const within = (b1, b2, p) => {
    const min = { x: Math.min(b1.x, b2.x), y: Math.min(b1.y, b2.y) }
    const max = { x: Math.max(b1.x, b2.x), y: Math.max(b1.y, b2.y) }

    return p.x >= min.x && p.x <= max.x && p.y >= min.y && p.y <= max.y
}

const penaltyFunction = (p1, p2, perimeterPoints) => {
    const [dx, dy] = [p2.x - p1.x, p2.y - p1.y]
    const m = dy / dx

    const [a, c] = [-m, m * p1.x - p1.y]

    let penalty = dx * dx + dy * dy

    // penalty = Infinity if it leaves the bounds
    const n = perimeterPoints.length
    for (let i = 0; i < n; i++) {
        const point = perimeterPoints[i]
        const next = perimeterPoints[(i + 1) % n]

        const [edx, edy] = [next.x - point.x, next.y - point.y]
        const em = edy / edx
        if (em == undefined)
            console.log(point, next)
        const [ea, ec] = [-em, em * point.x - point.y]

        const denominator = ea - a
        const intersect = { x: (ec - c) / denominator, y: (c * ea - ec * a) / denominator }

        if (within(p1, p2, intersect) && within(point, next, intersect)) {
            penalty = Number.MAX_SAFE_INTEGER
            break
        }
    }

    return penalty
}

const genAdjacenty = (points, perimeterPoints) => {
    const tsp = new Array(points.length)
    for (let i = 0; i < points.length; i++) {
        tsp[i] = new Array(points.length).fill(0)
        for (let j = 0; j < points.length; j++) {
            tsp[i][j] = penaltyFunction(points[i], points[j], perimeterPoints)
        }
    }
    return tsp
}


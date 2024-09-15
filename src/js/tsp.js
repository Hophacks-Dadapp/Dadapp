// Javascript program for the above approach

// Function to find the minimum
// cost path for all the paths
export const findMinRoute = (points) => {
    const tsp = genAdjacenty(points)

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

const penaltyFunction = (p1, p2) => {
    const [dx, dy] = [p2.x - p1.x, p2.y - p2.y]
    return dx * dx + dy * dy
}

const genAdjacenty = (points) => {
    const tsp = new Array(points.length)
    for (let i = 0; i < points.length; i++) {
        tsp[i] = new Array(points.length).fill(0)
        for (let j = 0; j < points.length; j++) {
            tsp[i][j] = penaltyFunction(points[i], points[j])
        }
    }
    return tsp
}


const KEYS = {
	LEFT: 37,
	UP: 38,
	RIGHT: 39,
	DOWN: 40,
}

export const isArrowKey = ({keyCode}) => keyCode >= 37 && keyCode <= 40

const translateKeyToDirection = e => {
	switch (e.keyCode) {			
		case KEYS.LEFT:  return 'left'
		case KEYS.RIGHT: return 'right'
		case KEYS.UP:    return 'up'
		case KEYS.DOWN:  return 'down'
	}
}

const calculateNodePosition = node => {
	const {left, right, top, bottom, width, height} = node.getBoundingClientRect()
	const centerX = left + (width / 2)
	const centerY = top + (height / 2)
	return {left, right, top, bottom, width, height, node, centerX, centerY}
}

const sortBy = key => (a, b) => a[key] - b[key]

const sortAndFilter = (candidates, key) => {
	const sorted = candidates.sort(sortBy(key))
	const lowest = sorted[0]
	return sorted.filter(item => item[key] === lowest[key])
}

const sortByMainEdge = (candidates, current, directionEdges) => {
	const [mainEdgeCurrent, mainEdgeNeighbour] = directionEdges
	const mainEdgeDist = 'mainEdgeDist'

	candidates.forEach(item => {
		const rawDist = current[mainEdgeCurrent] - item[mainEdgeNeighbour]
		item[mainEdgeDist] = Math.round(Math.abs(rawDist))
	})

	return sortAndFilter(candidates, mainEdgeDist)
}

const sortBySecondaryEdge = (candidates, current, directionEdges) => {
	const [, , secondaryEdge1, secondaryEdge2] = directionEdges

	const aligned = candidates.filter(item => {
		return item[secondaryEdge1] === current[secondaryEdge1]
			|| item[secondaryEdge2] === current[secondaryEdge2]
	})

	return aligned.length > 0 ? aligned : candidates
}

const sortByCenter = (candidates, current) => {
	candidates.map(item => {
		const x = Math.abs(current.centerX - item.centerX)
		const y = Math.abs(current.centerY - item.centerY)
		item.centerDistance = Math.round(Math.sqrt(x * x + y * y))
	})

	return sortAndFilter(candidates, 'centerDistance')
}

export const findNextNode = (focusableNodes, currentNode, eventOrDirection) => {
	const direction = typeof eventOrDirection === 'string'
					? eventOrDirection
					: translateKeyToDirection(eventOrDirection)

	focusableNodes = new Set(focusableNodes)
	focusableNodes.delete(currentNode)

	let current = calculateNodePosition(document.activeElement)
	let filtered = Array.from(focusableNodes).map(calculateNodePosition)
	let directionEdges

	if (direction === 'right') filtered = filtered.filter(item => item.left >= current.right)
	if (direction === 'left')  filtered = filtered.filter(item => item.right <= current.left)
	if (direction === 'down')  filtered = filtered.filter(item => item.top >= current.bottom)
	if (direction === 'up')    filtered = filtered.filter(item => item.bottom <= current.top)

	if (direction === 'right') directionEdges = ['right', 'left', 'top', 'bottom']
	if (direction === 'left')  directionEdges = ['left', 'right', 'top', 'bottom']
	if (direction === 'down')  directionEdges = ['bottom', 'top', 'left', 'right']
	if (direction === 'up')    directionEdges = ['top', 'bottom', 'left', 'right']

	filtered = sortByMainEdge(filtered, current, directionEdges)
	filtered = sortBySecondaryEdge(filtered, current, directionEdges)
	if (filtered.length > 1) filtered = sortByCenter(filtered, current)

	return filtered[0]?.node
}

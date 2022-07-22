const KEYS = {
	LEFT: 37,
	UP: 38,
	RIGHT: 39,
	DOWN: 40,
}

const LEFT = 'left'
const UP = 'up'
const RIGHT = 'right'
const DOWN = 'down'

const VERTICAL = 'vertical'
const HORIZONTAL = 'horizontal'

const getAxis = direction => direction === UP || direction === DOWN ? VERTICAL : HORIZONTAL

export const isArrowKey = ({keyCode}) => keyCode >= 37 && keyCode <= 40

const translateKeyToDirection = e => {
	switch (e.keyCode) {			
		case KEYS.LEFT:  return LEFT
		case KEYS.RIGHT: return RIGHT
		case KEYS.UP:    return UP
		case KEYS.DOWN:  return DOWN
	}
}

const calculateNodePosition = node => {
	const {left, right, top, bottom, width, height} = node.getBoundingClientRect()
	const centerX = left + (width / 2)
	const centerY = top + (height / 2)
	return {left, right, top, bottom, width, height, node, centerX, centerY}
}

const calculateOverlap = (target, source, lowerSide, upperSide, sizeKey) => {
	let lowerDiff = target[lowerSide] - source[lowerSide]
	let upperDiff = target[upperSide] - source[lowerSide]
	let lowerClamped = clamp(lowerDiff, 0, source[sizeKey])
	let upperClamped = clamp(upperDiff, 0, source[sizeKey])
	let ratio = (upperClamped - lowerClamped) / source[sizeKey]
	return Math.round(ratio * 100)
}

const calculateOverlaps = (filtered, current, directionEdges) => {
	const [, , lowerSide, upperSide, sizeKey] = directionEdges

	for (let item of filtered) {
		// how much size of item's total size is shared with 'current'
		item.overlapSelfSize  = calculateOverlap(current, item, lowerSide, upperSide, sizeKey)
		// how much size of 'current' is shared with the 'item'. (is item inside current)
		item.overlapCurrentSize = calculateOverlap(item, current, lowerSide, upperSide, sizeKey)
	}
}

const sortLowestToHighest = key => (a, b) => a[key] - b[key]
const sortHighestToLowest = key => (a, b) => b[key] - a[key]

const sortAndFilter = (candidates, key, sorter) => {
	const sorted = candidates.sort(sorter(key))
	const lowest = sorted[0]
	return lowest ? sorted.filter(item => item[key] === lowest[key]) : sorted
}

const sortAndGetLowest = (...args) => sortAndFilter(...args, sortLowestToHighest)
const sortAndGetHighest = (...args) => sortAndFilter(...args, sortHighestToLowest)

const sortByMainEdge = (candidates, current, directionEdges) => {
	const [mainEdgeCurrent, mainEdgeNeighbour] = directionEdges

	candidates.forEach(item => {
		const rawDist = current[mainEdgeCurrent] - item[mainEdgeNeighbour]
		item.mainEdgeDist = Math.round(Math.abs(rawDist))
	})

	return sortAndGetLowest(candidates, 'mainEdgeDist')
}

const sortBySecondaryEdge = (candidates, current, directionEdges) => {
	const [, , side1, side2] = directionEdges

	const aligned = candidates.filter(item => {
		return item[side1] === current[side1]
			|| item[side2] === current[side2]
	})

	return aligned.length > 0 ? aligned : candidates
}

const sortByCenter = (candidates, current) => {
	candidates.map(item => {
		const x = Math.abs(current.centerX - item.centerX)
		const y = Math.abs(current.centerY - item.centerY)
		item.centerDistance = Math.round(Math.sqrt(x * x + y * y))
	})

	return sortAndGetLowest(candidates, 'centerDistance')
}

const clamp = (val, min, max) => Math.min(Math.max(val, min), max)

export class GridNav {

	maxHistory = 5
	axisHistory = []
	lastDirection
	lastAxis

	constructor() {
		//document.addEventListener('click', this.reset)
		//document.addEventListener('blur', this.reset)
	}

	calculateNodes(nodes) {
		return this.targets = Array.from(nodes).map(calculateNodePosition)
	}

	findNext = (focusableNodes, currentNode, eventOrDirection) => {
		const direction = typeof eventOrDirection === 'string'
						? eventOrDirection
						: translateKeyToDirection(eventOrDirection)
		const axis = getAxis(direction)

		if (this.lastAxis !== axis) this.reset()

		focusableNodes = new Set(focusableNodes)
		focusableNodes.delete(currentNode)

		let current = calculateNodePosition(document.activeElement)
		let filtered = this.calculateNodes(focusableNodes)
		let directionEdges

		if (direction === RIGHT) filtered = filtered.filter(item => item.left >= current.right)
		if (direction === LEFT)  filtered = filtered.filter(item => item.right <= current.left)
		if (direction === DOWN)  filtered = filtered.filter(item => item.top >= current.bottom)
		if (direction === UP)    filtered = filtered.filter(item => item.bottom <= current.top)

		if (direction === RIGHT) directionEdges = ['right', 'left', 'top', 'bottom', 'height']
		if (direction === LEFT)  directionEdges = ['left', 'right', 'top', 'bottom', 'height']
		if (direction === DOWN)  directionEdges = ['bottom', 'top', 'left', 'right', 'width']
		if (direction === UP)    directionEdges = ['top', 'bottom', 'left', 'right', 'width']

		filtered = sortByMainEdge(filtered, current, directionEdges)
        console.log('filtered A', filtered)
		//filtered = sortBySecondaryEdge(filtered, current, directionEdges)

		this.axisHistory.push(current)
		while (this.axisHistory.length >= this.maxHistory) this.axisHistory.shift()

		const vertical = direction === UP || direction === DOWN
		const horizontal = !vertical

		console.log('vertical', vertical, 'horizontal', horizontal)
		console.log('current', current.centerX, current.centerY)

        console.log('filtered B', filtered)

		if (filtered.length > 1) {
			filtered = this.filterOverlaping(filtered, current, directionEdges)
		}

		console.log('filtered C', filtered)

/*
		let history = [...this.axisHistory]
		while (filtered.length > 1 && history.length) {
			console.log('-'.repeat(30))
			let item = history.shift()
            console.log('node', item.node)
			const centerX = vertical   ? item.centerX : current.centerX
			const centerY = horizontal ? item.centerY : current.centerY
            console.log('x', centerX, '| item', item.centerX, 'current', current.centerX)
            console.log('y', centerY, '| item', item.centerY, 'current', current.centerY)
			filtered = sortByCenter(filtered, {centerX, centerY})
		}
		//if (filtered.length > 1) filtered = sortByCenter(filtered, current)
		//if (filtered.length > 1) console.log('ještě furt', this.axisHistory)
		console.log('filtered B', filtered)
*/


		const target = filtered[0]

		this.lastAxis = axis

		return target
	}

	filterOverlaping(items, current, directionEdges) {
		calculateOverlaps(items, current, directionEdges)

		let overlapingItems = items.filter(item => item.overlapSelfSize > 0)
		overlapingItems = sortAndGetHighest(overlapingItems, 'overlapSelfSize')
        console.log('~ overlapingItems', overlapingItems)

		// HERE SHOULD BE HISTORY CHECK

		overlapingItems = overlapingItems.filter(item => item.overlapCurrentSize > 0)
		overlapingItems = sortAndGetHighest(overlapingItems, 'overlapCurrentSize')
        console.log('~ overlapingItems', overlapingItems)

		return overlapingItems.length ? overlapingItems : items
	}

	reset = (direction) => {
		this.axisHistory = []
		this.lastDirection = direction
	}

}
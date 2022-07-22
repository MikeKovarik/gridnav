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
	return {left, right, top, bottom, width, height, node}
}

const calculateOverlap = (target, source, lowerSide, upperSide, sizeKey) => {
	let lowerDiff = target[lowerSide] - source[lowerSide]
	let upperDiff = target[upperSide] - source[lowerSide]
	let lowerClamped = clamp(lowerDiff, 0, source[sizeKey])
	let upperClamped = clamp(upperDiff, 0, source[sizeKey])
	let ratio = (upperClamped - lowerClamped) / source[sizeKey]
	return Math.round(ratio * 100)
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

const clamp = (val, min, max) => Math.min(Math.max(val, min), max)

export class GridNav {

	maxHistory = 5
	axisHistory = []
	lastDirection
	lastAxis

	calculateNodes(nodes) {
		return this.targets = Array.from(nodes).map(calculateNodePosition)
	}

	findNext = (focusableNodes, currentNode, eventOrDirection) => {
		this.setupDirectionAndAxis(eventOrDirection)

		if (this.lastAxis !== this.axis) this.reset()

		focusableNodes = new Set(focusableNodes)
		focusableNodes.delete(currentNode)

		this.current = calculateNodePosition(document.activeElement)
		this.filtered = this.calculateNodes(focusableNodes)


		this.findDirection()

		this.filtered = sortByMainEdge(this.filtered, this.current, this.directionEdges)

		if (this.filtered.length > 1)
			this.filtered = this.filterOverlaping(this.filtered, this.current, this.axisHistory)

		const [target] = this.filtered

		this.lastAxis = this.axis
		this.axisHistory.unshift(this.current)
		while (this.axisHistory.length >= this.maxHistory) this.axisHistory.pop()

		return target
	}

	setupDirectionAndAxis(eventOrDirection) {
		this.direction = typeof eventOrDirection === 'string'
						? eventOrDirection
						: translateKeyToDirection(eventOrDirection)
		this.axis = getAxis(this.direction)
		this.directionEdges = this.getDirectionEdges(this.direction)
	}

	findDirection() {
		const {direction} = this

		if (direction === RIGHT) this.filtered = this.filtered.filter(item => item.left >= this.current.right)
		if (direction === LEFT)  this.filtered = this.filtered.filter(item => item.right <= this.current.left)
		if (direction === DOWN)  this.filtered = this.filtered.filter(item => item.top >= this.current.bottom)
		if (direction === UP)    this.filtered = this.filtered.filter(item => item.bottom <= this.current.top)

	}

	getDirectionEdges(direction) {
		if (direction === RIGHT) return ['right', 'left', 'top', 'bottom', 'height']
		if (direction === LEFT)  return ['left', 'right', 'top', 'bottom', 'height']
		if (direction === DOWN)  return ['bottom', 'top', 'left', 'right', 'width']
		if (direction === UP)    return ['top', 'bottom', 'left', 'right', 'width']
	}

	filterOverlaping(items, current, history) {
		const {directionEdges} = this

		const calculateOverlaps = (filtered, current, directionEdges) => {
			const [, , lowerSide, upperSide, sizeKey] = directionEdges
			return filtered.map(item => {
				// how much size of item's total size is shared with 'current'
				const overlapSelfSize  = calculateOverlap(current, item, lowerSide, upperSide, sizeKey)
				// how much size of 'current' is shared with the 'item'. (is item inside current)
				const overlapCurrentSize = calculateOverlap(item, current, lowerSide, upperSide, sizeKey)
				return {...item, overlapSelfSize, overlapCurrentSize}
			})
		}

		let overlapingItems = calculateOverlaps(items, current, directionEdges)

		overlapingItems = overlapingItems.filter(item => item.overlapSelfSize > 0)
		overlapingItems = sortAndGetHighest(overlapingItems, 'overlapSelfSize')

		// HERE SHOULD BE HISTORY CHECK
		if (overlapingItems.length > 1 && history.length) {
			let [last, ...newHistory] = history
			overlapingItems = this.filterOverlaping(overlapingItems, last, newHistory)
		}

		overlapingItems = overlapingItems.filter(item => item.overlapCurrentSize > 0)
		overlapingItems = sortAndGetHighest(overlapingItems, 'overlapCurrentSize')

		return overlapingItems.length ? overlapingItems : items
	}

	reset(direction) {
		this.axisHistory = []
		this.lastDirection = direction
	}

}
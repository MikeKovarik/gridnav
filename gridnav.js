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

const sortLowestToHighest = key => (a, b) => a[key] - b[key]
const sortHighestToLowest = key => (a, b) => b[key] - a[key]

const sortAndFilter = (candidates, key, sorter) => {
	const sorted = candidates.sort(sorter(key))
	const lowest = sorted[0]
	return lowest ? sorted.filter(item => item[key] === lowest[key]) : sorted
}

const sortAndGetLowest = (...args) => sortAndFilter(...args, sortLowestToHighest)
const sortAndGetHighest = (...args) => sortAndFilter(...args, sortHighestToLowest)

const clamp = (val, min, max) => Math.min(Math.max(val, min), max)

export class GridNav {

	maxHistory = 5
	axisHistory = []
	lastDirection
	lastAxis

	calculateNodes(nodes) {
		return Array.from(nodes).map(calculateNodePosition)
	}

	findNext = (focusableNodes, currentNode, eventOrDirection) => {
		this.setupDirectionAndAxis(eventOrDirection)

		if (this.lastAxis !== this.axis) this.reset()

		focusableNodes = new Set(focusableNodes)
		focusableNodes.delete(currentNode)

		const source = calculateNodePosition(document.activeElement)
		let targets = this.calculateNodes(focusableNodes)

		targets = this.filterByDirection(targets, source)

		if (targets.length > 1)
			targets = this.filterByClosestParallel(targets, source)

		if (targets.length > 1)
			targets = this.filterOverlaping(targets, source, this.axisHistory)

		this.lastAxis = this.axis
		this.axisHistory.unshift(source)
		while (this.axisHistory.length >= this.maxHistory) this.axisHistory.pop()

		return targets[0]
	}

	setupDirectionAndAxis(eventOrDirection) {
		this.direction = typeof eventOrDirection === 'string'
						? eventOrDirection
						: translateKeyToDirection(eventOrDirection)
		this.axis = getAxis(this.direction)
		this.directionEdges = this.getDirectionEdges(this.direction)
	}

	getDirectionEdges(direction) {
		if (direction === RIGHT) return ['right', 'left', 'top', 'bottom', 'height']
		if (direction === LEFT)  return ['left', 'right', 'top', 'bottom', 'height']
		if (direction === DOWN)  return ['bottom', 'top', 'left', 'right', 'width']
		if (direction === UP)    return ['top', 'bottom', 'left', 'right', 'width']
	}

	filterByDirection(targets, source) {
		const {direction} = this
		if (direction === RIGHT) return targets.filter(item => item.left >= source.right)
		if (direction === LEFT)  return targets.filter(item => item.right <= source.left)
		if (direction === DOWN)  return targets.filter(item => item.top >= source.bottom)
		if (direction === UP)    return targets.filter(item => item.bottom <= source.top)
	}

	filterByClosestParallel(candidates, current) {
		const [mainEdgeCurrent, mainEdgeNeighbour] = this.directionEdges

		candidates.forEach(item => {
			const rawDist = current[mainEdgeCurrent] - item[mainEdgeNeighbour]
			item.mainEdgeDist = Math.round(Math.abs(rawDist))
		})

		return sortAndGetLowest(candidates, 'mainEdgeDist')
	}

	calculateOverlap(target, source, lowerSide, upperSide, sizeKey) {
		let lowerDiff = target[lowerSide] - source[lowerSide]
		let upperDiff = target[upperSide] - source[lowerSide]
		let lowerClamped = clamp(lowerDiff, 0, source[sizeKey])
		let upperClamped = clamp(upperDiff, 0, source[sizeKey])
		let ratio = (upperClamped - lowerClamped) / source[sizeKey]
		return Math.round(ratio * 100)
	}

	calculateOverlaps(targets, current) {
		const [, , lowerSide, upperSide, sizeKey] = this.directionEdges

		return targets.map(item => {
			// how much size of item's total size is shared with 'current'
			const overlapSelfSize = this.calculateOverlap(current, item, lowerSide, upperSide, sizeKey)
			// how much size of 'current' is shared with the 'item'. (is item inside current)
			const overlapCurrentSize = this.calculateOverlap(item, current, lowerSide, upperSide, sizeKey)
			return {...item, overlapSelfSize, overlapCurrentSize}
		})
	}

	filterOverlaping(targets, current, history) {
		let overlapingItems = this.calculateOverlaps(targets, current)

		overlapingItems = overlapingItems.filter(item => item.overlapSelfSize > 0)
		overlapingItems = sortAndGetHighest(overlapingItems, 'overlapSelfSize')

		// HERE SHOULD BE HISTORY CHECK
		if (overlapingItems.length > 1 && history.length) {
			let [last, ...newHistory] = history
			overlapingItems = this.filterOverlaping(overlapingItems, last, newHistory)
		}

		overlapingItems = overlapingItems.filter(item => item.overlapCurrentSize > 0)
		overlapingItems = sortAndGetHighest(overlapingItems, 'overlapCurrentSize')

		return overlapingItems.length ? overlapingItems : targets
	}

	reset(direction) {
		this.axisHistory = []
		this.lastDirection = direction
	}

}
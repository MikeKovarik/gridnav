export const KEY = {
	LEFT:  37,
	UP:    38,
	RIGHT: 39,
	DOWN:  40,
}

export const DIRECTION = {
	LEFT:  'left',
	UP:    'up',
	RIGHT: 'right',
	DOWN:  'down',
}

export const EDGES = {
	RIGHT: ['right', 'left', 'top', 'bottom', 'height'],
	LEFT:  ['left', 'right', 'top', 'bottom', 'height'],
	DOWN:  ['bottom', 'top', 'left', 'right', 'width'],
	UP:    ['top', 'bottom', 'left', 'right', 'width'],
}

export const AXIS = {
	VERTICAL:   'vertical',
	HORIZONTAL: 'horizontal',
}

export const isArrowKey = ({keyCode}) => keyCode >= 37 && keyCode <= 40

const sortAndFilter = (targets, key, sorter) => {
	const sorted = targets.sort(sorter(key))
	const lowest = sorted[0]
	return lowest ? sorted.filter(target => target[key] === lowest[key]) : sorted
}

const sortAndGetLowest  = (...args) => sortAndFilter(...args, key => (a, b) => a[key] - b[key])
const sortAndGetHighest = (...args) => sortAndFilter(...args, key => (a, b) => b[key] - a[key])

const clamp = (val, min, max) => Math.min(Math.max(val, min), max)

class NodePos {

	static from(node) {
		return new NodePos(node)
	}

	constructor(node) {
		this.node = node
		const {left, right, top, bottom, width, height} = node.getBoundingClientRect()
		Object.assign(this, {left, right, top, bottom, width, height})
	}

}

class Overlap {

	constructor(target, source, lowerSide, upperSide, sizeKey) {
		// how much size of target's total size is shared with 'source'
		const overlapSelfSize = this.calculateOverlap(source, target, lowerSide, upperSide, sizeKey)
		// how much size of 'source' is shared with the 'target'. (is target inside source)
		const overlapCurrentSize = this.calculateOverlap(target, source, lowerSide, upperSide, sizeKey)
		return {...target, overlapSelfSize, overlapCurrentSize}
	}

	calculateOverlap(target, source, lowerSide, upperSide, sizeKey) {
		const lowerDiff = target[lowerSide] - source[lowerSide]
		const upperDiff = target[upperSide] - source[lowerSide]
		const lowerClamped = clamp(lowerDiff, 0, source[sizeKey])
		const upperClamped = clamp(upperDiff, 0, source[sizeKey])
		const ratio = (upperClamped - lowerClamped) / source[sizeKey]
		return Math.round(ratio * 100)
	}

}

export class GridNav {

	maxHistory = 5
	axisHistory = []
	lastAxis

	findNext = (focusableNodes, currentNode, eventOrDirection) => {
		this.setupDirectionAndAxis(eventOrDirection)

		if (this.lastAxis && this.lastAxis !== this.axis) this.reset()

		focusableNodes = new Set(focusableNodes)
		focusableNodes.delete(currentNode)

		const source = NodePos.from(document.activeElement)
		let targets = Array.from(focusableNodes).map(NodePos.from)

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

	reset() {
		this.axisHistory = []
	}

	setupDirectionAndAxis(eventOrDirection) {
		this.direction = typeof eventOrDirection === 'string'
						? eventOrDirection
						: this.translateKeyToDirection(eventOrDirection)
		this.axis = this.getAxis(this.direction)
		this.directionEdges = this.getDirectionEdges(this.direction)
	}

	translateKeyToDirection = e => {
		switch (e.keyCode) {			
			case KEY.LEFT:  return DIRECTION.LEFT
			case KEY.RIGHT: return DIRECTION.RIGHT
			case KEY.UP:    return DIRECTION.UP
			case KEY.DOWN:  return DIRECTION.DOWN
		}
	}

	getAxis(direction) {
		return direction === DIRECTION.UP || direction === DIRECTION.DOWN
			? AXIS.VERTICAL
			: AXIS.HORIZONTAL
	}


	getDirectionEdges(direction) {
		if (direction === DIRECTION.RIGHT) return EDGES.RIGHT
		if (direction === DIRECTION.LEFT)  return EDGES.LEFT
		if (direction === DIRECTION.DOWN)  return EDGES.DOWN
		if (direction === DIRECTION.UP)    return EDGES.UP
	}

	filterByDirection(targets, source) {
		const {direction} = this
		if (direction === DIRECTION.RIGHT) return targets.filter(target => target.left >= source.right)
		if (direction === DIRECTION.LEFT)  return targets.filter(target => target.right <= source.left)
		if (direction === DIRECTION.DOWN)  return targets.filter(target => target.top >= source.bottom)
		if (direction === DIRECTION.UP)    return targets.filter(target => target.bottom <= source.top)
	}

	filterByClosestParallel(targets, source) {
		const [mainEdgeCurrent, mainEdgeNeighbour] = this.directionEdges

		for (let target of targets) {
			const rawDist = source[mainEdgeCurrent] - target[mainEdgeNeighbour]
			target.mainEdgeDist = Math.round(Math.abs(rawDist))
		}

		return sortAndGetLowest(targets, 'mainEdgeDist')
	}

	filterOverlaping(targets, source, history) {
		const [, , lowerSide, upperSide, sizeKey] = this.directionEdges

		let overlapingItems = targets.map(target => new Overlap(target, source, lowerSide, upperSide, sizeKey))

		overlapingItems = overlapingItems.filter(target => target.overlapSelfSize > 0)
		overlapingItems = sortAndGetHighest(overlapingItems, 'overlapSelfSize')

		// HERE SHOULD BE HISTORY CHECK
		if (overlapingItems.length > 1 && history.length) {
			let [last, ...newHistory] = history
			overlapingItems = this.filterOverlaping(overlapingItems, last, newHistory)
		}

		overlapingItems = overlapingItems.filter(target => target.overlapCurrentSize > 0)
		overlapingItems = sortAndGetHighest(overlapingItems, 'overlapCurrentSize')

		return overlapingItems.length ? overlapingItems : targets
	}

}
# gridnav
🧭 Spatial navigation with keyboard arrows.

Ideal for navigating elements focuable with `tabindex` attribute.

## Installation

```
npm install gridnav
```

## Usage

```js
import {findNode} from './gridnav.js'
// direction can be 'left', 'right', 'up' or 'down'
const target = findNode(focusableNodes, currentNode, direction)
```

Simplistic example with keyboard evets.

```js
import {findNode, isArrowKey} from './gridnav.js'
document.addEventListener('keyup', e => {
  if (isArrowKey(e)) {
    const focusableNodes = document.querySelectorAll('[tabindex]')
    const target = findNode(focusableNodes, document.activeElement, e)
    target.node.focus()
  }
})
```

## License

MIT, Mike Kovařík, Mutiny.cz

'use strict'

// Imports
import initBlazy from './modules/blazy'

// Document states
document.onreadystatechange = function () {
  if (document.readyState === 'interactive') {
    console.log('Page interactive')
  }

  if (document.readyState === 'complete') {
    console.log('Page ready')

    // Initialize lazyload
    initBlazy()
  }
}

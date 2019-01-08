'use strict'

import Blazy from 'blazy'

let initBlazy = () => {
  let blazy = new Blazy({
    selector: '.lazy',
    successClass: 'lazyLoaded',
    errorClass: 'lazyErorr',
    error: (ele, msg) => {
      console.log('lazyload error: ', ele, msg)
    },
    success: (ele, msg) => {
      let parent = ele.parentNode
      parent.className += ' hasLazyLoaded'
    }
  })
}

export default initBlazy

(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/*!
  hey, [be]Lazy.js - v1.8.2 - 2016.10.25
  A fast, small and dependency free lazy load script (https://github.com/dinbror/blazy)
  (c) Bjoern Klinggaard - @bklinggaard - http://dinbror.dk/blazy
*/
;
(function(root, blazy) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register bLazy as an anonymous module
        define(blazy);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = blazy();
    } else {
        // Browser globals. Register bLazy on window
        root.Blazy = blazy();
    }
})(this, function() {
    'use strict';

    //private vars
    var _source, _viewport, _isRetina, _supportClosest, _attrSrc = 'src', _attrSrcset = 'srcset';

    // constructor
    return function Blazy(options) {
        //IE7- fallback for missing querySelectorAll support
        if (!document.querySelectorAll) {
            var s = document.createStyleSheet();
            document.querySelectorAll = function(r, c, i, j, a) {
                a = document.all, c = [], r = r.replace(/\[for\b/gi, '[htmlFor').split(',');
                for (i = r.length; i--;) {
                    s.addRule(r[i], 'k:v');
                    for (j = a.length; j--;) a[j].currentStyle.k && c.push(a[j]);
                    s.removeRule(0);
                }
                return c;
            };
        }

        //options and helper vars
        var scope = this;
        var util = scope._util = {};
        util.elements = [];
        util.destroyed = true;
        scope.options = options || {};
        scope.options.error = scope.options.error || false;
        scope.options.offset = scope.options.offset || 100;
        scope.options.root = scope.options.root || document;
        scope.options.success = scope.options.success || false;
        scope.options.selector = scope.options.selector || '.b-lazy';
        scope.options.separator = scope.options.separator || '|';
        scope.options.containerClass = scope.options.container;
        scope.options.container = scope.options.containerClass ? document.querySelectorAll(scope.options.containerClass) : false;
        scope.options.errorClass = scope.options.errorClass || 'b-error';
        scope.options.breakpoints = scope.options.breakpoints || false;
        scope.options.loadInvisible = scope.options.loadInvisible || false;
        scope.options.successClass = scope.options.successClass || 'b-loaded';
        scope.options.validateDelay = scope.options.validateDelay || 25;
        scope.options.saveViewportOffsetDelay = scope.options.saveViewportOffsetDelay || 50;
        scope.options.srcset = scope.options.srcset || 'data-srcset';
        scope.options.src = _source = scope.options.src || 'data-src';
        _supportClosest = Element.prototype.closest;
        _isRetina = window.devicePixelRatio > 1;
        _viewport = {};
        _viewport.top = 0 - scope.options.offset;
        _viewport.left = 0 - scope.options.offset;


        /* public functions
         ************************************/
        scope.revalidate = function() {
            initialize(scope);
        };
        scope.load = function(elements, force) {
            var opt = this.options;
            if (elements && elements.length === undefined) {
                loadElement(elements, force, opt);
            } else {
                each(elements, function(element) {
                    loadElement(element, force, opt);
                });
            }
        };
        scope.destroy = function() {            
            var util = scope._util;
            if (scope.options.container) {
                each(scope.options.container, function(object) {
                    unbindEvent(object, 'scroll', util.validateT);
                });
            }
            unbindEvent(window, 'scroll', util.validateT);
            unbindEvent(window, 'resize', util.validateT);
            unbindEvent(window, 'resize', util.saveViewportOffsetT);
            util.count = 0;
            util.elements.length = 0;
            util.destroyed = true;
        };

        //throttle, ensures that we don't call the functions too often
        util.validateT = throttle(function() {
            validate(scope);
        }, scope.options.validateDelay, scope);
        util.saveViewportOffsetT = throttle(function() {
            saveViewportOffset(scope.options.offset);
        }, scope.options.saveViewportOffsetDelay, scope);
        saveViewportOffset(scope.options.offset);

        //handle multi-served image src (obsolete)
        each(scope.options.breakpoints, function(object) {
            if (object.width >= window.screen.width) {
                _source = object.src;
                return false;
            }
        });

        // start lazy load
        setTimeout(function() {
            initialize(scope);
        }); // "dom ready" fix

    };


    /* Private helper functions
     ************************************/
    function initialize(self) {
        var util = self._util;
        // First we create an array of elements to lazy load
        util.elements = toArray(self.options);
        util.count = util.elements.length;
        // Then we bind resize and scroll events if not already binded
        if (util.destroyed) {
            util.destroyed = false;
            if (self.options.container) {
                each(self.options.container, function(object) {
                    bindEvent(object, 'scroll', util.validateT);
                });
            }
            bindEvent(window, 'resize', util.saveViewportOffsetT);
            bindEvent(window, 'resize', util.validateT);
            bindEvent(window, 'scroll', util.validateT);
        }
        // And finally, we start to lazy load.
        validate(self);
    }

    function validate(self) {
        var util = self._util;
        for (var i = 0; i < util.count; i++) {
            var element = util.elements[i];
            if (elementInView(element, self.options) || hasClass(element, self.options.successClass)) {
                self.load(element);
                util.elements.splice(i, 1);
                util.count--;
                i--;
            }
        }
        if (util.count === 0) {
            self.destroy();
        }
    }

    function elementInView(ele, options) {
        var rect = ele.getBoundingClientRect();

        if(options.container && _supportClosest){
            // Is element inside a container?
            var elementContainer = ele.closest(options.containerClass);
            if(elementContainer){
                var containerRect = elementContainer.getBoundingClientRect();
                // Is container in view?
                if(inView(containerRect, _viewport)){
                    var top = containerRect.top - options.offset;
                    var right = containerRect.right + options.offset;
                    var bottom = containerRect.bottom + options.offset;
                    var left = containerRect.left - options.offset;
                    var containerRectWithOffset = {
                        top: top > _viewport.top ? top : _viewport.top,
                        right: right < _viewport.right ? right : _viewport.right,
                        bottom: bottom < _viewport.bottom ? bottom : _viewport.bottom,
                        left: left > _viewport.left ? left : _viewport.left
                    };
                    // Is element in view of container?
                    return inView(rect, containerRectWithOffset);
                } else {
                    return false;
                }
            }
        }      
        return inView(rect, _viewport);
    }

    function inView(rect, viewport){
        // Intersection
        return rect.right >= viewport.left &&
               rect.bottom >= viewport.top && 
               rect.left <= viewport.right && 
               rect.top <= viewport.bottom;
    }

    function loadElement(ele, force, options) {
        // if element is visible, not loaded or forced
        if (!hasClass(ele, options.successClass) && (force || options.loadInvisible || (ele.offsetWidth > 0 && ele.offsetHeight > 0))) {
            var dataSrc = getAttr(ele, _source) || getAttr(ele, options.src); // fallback to default 'data-src'
            if (dataSrc) {
                var dataSrcSplitted = dataSrc.split(options.separator);
                var src = dataSrcSplitted[_isRetina && dataSrcSplitted.length > 1 ? 1 : 0];
                var srcset = getAttr(ele, options.srcset);
                var isImage = equal(ele, 'img');
                var parent = ele.parentNode;
                var isPicture = parent && equal(parent, 'picture');
                // Image or background image
                if (isImage || ele.src === undefined) {
                    var img = new Image();
                    // using EventListener instead of onerror and onload
                    // due to bug introduced in chrome v50 
                    // (https://productforums.google.com/forum/#!topic/chrome/p51Lk7vnP2o)
                    var onErrorHandler = function() {
                        if (options.error) options.error(ele, "invalid");
                        addClass(ele, options.errorClass);
                        unbindEvent(img, 'error', onErrorHandler);
                        unbindEvent(img, 'load', onLoadHandler);
                    };
                    var onLoadHandler = function() {
                        // Is element an image
                        if (isImage) {
                            if(!isPicture) {
                                handleSources(ele, src, srcset);
                            }
                        // or background-image
                        } else {
                            ele.style.backgroundImage = 'url("' + src + '")';
                        }
                        itemLoaded(ele, options);
                        unbindEvent(img, 'load', onLoadHandler);
                        unbindEvent(img, 'error', onErrorHandler);
                    };
                    
                    // Picture element
                    if (isPicture) {
                        img = ele; // Image tag inside picture element wont get preloaded
                        each(parent.getElementsByTagName('source'), function(source) {
                            handleSource(source, _attrSrcset, options.srcset);
                        });
                    }
                    bindEvent(img, 'error', onErrorHandler);
                    bindEvent(img, 'load', onLoadHandler);
                    handleSources(img, src, srcset); // Preload

                } else { // An item with src like iframe, unity games, simpel video etc
                    ele.src = src;
                    itemLoaded(ele, options);
                }
            } else {
                // video with child source
                if (equal(ele, 'video')) {
                    each(ele.getElementsByTagName('source'), function(source) {
                        handleSource(source, _attrSrc, options.src);
                    });
                    ele.load();
                    itemLoaded(ele, options);
                } else {
                    if (options.error) options.error(ele, "missing");
                    addClass(ele, options.errorClass);
                }
            }
        }
    }

    function itemLoaded(ele, options) {
        addClass(ele, options.successClass);
        if (options.success) options.success(ele);
        // cleanup markup, remove data source attributes
        removeAttr(ele, options.src);
        removeAttr(ele, options.srcset);
        each(options.breakpoints, function(object) {
            removeAttr(ele, object.src);
        });
    }

    function handleSource(ele, attr, dataAttr) {
        var dataSrc = getAttr(ele, dataAttr);
        if (dataSrc) {
            setAttr(ele, attr, dataSrc);
            removeAttr(ele, dataAttr);
        }
    }

    function handleSources(ele, src, srcset){
        if(srcset) {
            setAttr(ele, _attrSrcset, srcset); //srcset
        }
        ele.src = src; //src 
    }

    function setAttr(ele, attr, value){
        ele.setAttribute(attr, value);
    }

    function getAttr(ele, attr) {
        return ele.getAttribute(attr);
    }

    function removeAttr(ele, attr){
        ele.removeAttribute(attr); 
    }

    function equal(ele, str) {
        return ele.nodeName.toLowerCase() === str;
    }

    function hasClass(ele, className) {
        return (' ' + ele.className + ' ').indexOf(' ' + className + ' ') !== -1;
    }

    function addClass(ele, className) {
        if (!hasClass(ele, className)) {
            ele.className += ' ' + className;
        }
    }

    function toArray(options) {
        var array = [];
        var nodelist = (options.root).querySelectorAll(options.selector);
        for (var i = nodelist.length; i--; array.unshift(nodelist[i])) {}
        return array;
    }

    function saveViewportOffset(offset) {
        _viewport.bottom = (window.innerHeight || document.documentElement.clientHeight) + offset;
        _viewport.right = (window.innerWidth || document.documentElement.clientWidth) + offset;
    }

    function bindEvent(ele, type, fn) {
        if (ele.attachEvent) {
            ele.attachEvent && ele.attachEvent('on' + type, fn);
        } else {
            ele.addEventListener(type, fn, { capture: false, passive: true });
        }
    }

    function unbindEvent(ele, type, fn) {
        if (ele.detachEvent) {
            ele.detachEvent && ele.detachEvent('on' + type, fn);
        } else {
            ele.removeEventListener(type, fn, { capture: false, passive: true });
        }
    }

    function each(object, fn) {
        if (object && fn) {
            var l = object.length;
            for (var i = 0; i < l && fn(object[i], i) !== false; i++) {}
        }
    }

    function throttle(fn, minDelay, scope) {
        var lastCall = 0;
        return function() {
            var now = +new Date();
            if (now - lastCall < minDelay) {
                return;
            }
            lastCall = now;
            fn.apply(scope, arguments);
        };
    }
});

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _blazy = require('blazy');

var _blazy2 = _interopRequireDefault(_blazy);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var initBlazy = function initBlazy() {
  var blazy = new _blazy2.default({
    selector: '.lazy',
    successClass: 'lazyLoaded',
    errorClass: 'lazyErorr',
    error: function error(ele, msg) {
      console.log('lazyload error: ', ele, msg);
    },
    success: function success(ele, msg) {
      var parent = ele.parentNode;
      parent.className += ' hasLazyLoaded';
    }
  });
};

exports.default = initBlazy;

},{"blazy":1}],3:[function(require,module,exports){
'use strict';

// Imports

var _blazy = require('./modules/blazy');

var _blazy2 = _interopRequireDefault(_blazy);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Document states
document.onreadystatechange = function () {
  if (document.readyState === 'interactive') {
    console.log('Page interactive');
  }

  if (document.readyState === 'complete') {
    console.log('Page ready');

    // Initialize lazyload
    (0, _blazy2.default)();
  }
};

},{"./modules/blazy":2}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYmxhenkvYmxhenkuanMiLCJzb3VyY2UvamF2YXNjcmlwdHMvbW9kdWxlcy9ibGF6eS5qcyIsInNvdXJjZS9qYXZhc2NyaXB0cy9zY3JpcHQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xYQTs7Ozs7O0FBRUE7Ozs7OztBQUVBLElBQUksWUFBWSxTQUFaLFNBQVksR0FBTTtBQUNwQixNQUFJLFFBQVEsSUFBSSxlQUFKLENBQVU7QUFDcEIsY0FBVSxPQURVO0FBRXBCLGtCQUFjLFlBRk07QUFHcEIsZ0JBQVksV0FIUTtBQUlwQixXQUFPLGVBQUMsR0FBRCxFQUFNLEdBQU4sRUFBYztBQUNuQixjQUFRLEdBQVIsQ0FBWSxrQkFBWixFQUFnQyxHQUFoQyxFQUFxQyxHQUFyQztBQUNELEtBTm1CO0FBT3BCLGFBQVMsaUJBQUMsR0FBRCxFQUFNLEdBQU4sRUFBYztBQUNyQixVQUFJLFNBQVMsSUFBSSxVQUFqQjtBQUNBLGFBQU8sU0FBUCxJQUFvQixnQkFBcEI7QUFDRDtBQVZtQixHQUFWLENBQVo7QUFZRCxDQWJEOztrQkFlZSxTOzs7QUNuQmY7O0FBRUE7O0FBQ0E7Ozs7OztBQUVBO0FBQ0EsU0FBUyxrQkFBVCxHQUE4QixZQUFZO0FBQ3hDLE1BQUksU0FBUyxVQUFULEtBQXdCLGFBQTVCLEVBQTJDO0FBQ3pDLFlBQVEsR0FBUixDQUFZLGtCQUFaO0FBQ0Q7O0FBRUQsTUFBSSxTQUFTLFVBQVQsS0FBd0IsVUFBNUIsRUFBd0M7QUFDdEMsWUFBUSxHQUFSLENBQVksWUFBWjs7QUFFQTtBQUNBO0FBQ0Q7QUFDRixDQVhEIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLyohXG4gIGhleSwgW2JlXUxhenkuanMgLSB2MS44LjIgLSAyMDE2LjEwLjI1XG4gIEEgZmFzdCwgc21hbGwgYW5kIGRlcGVuZGVuY3kgZnJlZSBsYXp5IGxvYWQgc2NyaXB0IChodHRwczovL2dpdGh1Yi5jb20vZGluYnJvci9ibGF6eSlcbiAgKGMpIEJqb2VybiBLbGluZ2dhYXJkIC0gQGJrbGluZ2dhYXJkIC0gaHR0cDovL2RpbmJyb3IuZGsvYmxhenlcbiovXG47XG4oZnVuY3Rpb24ocm9vdCwgYmxhenkpIHtcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIC8vIEFNRC4gUmVnaXN0ZXIgYkxhenkgYXMgYW4gYW5vbnltb3VzIG1vZHVsZVxuICAgICAgICBkZWZpbmUoYmxhenkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIC8vIE5vZGUuIERvZXMgbm90IHdvcmsgd2l0aCBzdHJpY3QgQ29tbW9uSlMsIGJ1dFxuICAgICAgICAvLyBvbmx5IENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cyxcbiAgICAgICAgLy8gbGlrZSBOb2RlLlxuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGJsYXp5KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQnJvd3NlciBnbG9iYWxzLiBSZWdpc3RlciBiTGF6eSBvbiB3aW5kb3dcbiAgICAgICAgcm9vdC5CbGF6eSA9IGJsYXp5KCk7XG4gICAgfVxufSkodGhpcywgZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy9wcml2YXRlIHZhcnNcbiAgICB2YXIgX3NvdXJjZSwgX3ZpZXdwb3J0LCBfaXNSZXRpbmEsIF9zdXBwb3J0Q2xvc2VzdCwgX2F0dHJTcmMgPSAnc3JjJywgX2F0dHJTcmNzZXQgPSAnc3Jjc2V0JztcblxuICAgIC8vIGNvbnN0cnVjdG9yXG4gICAgcmV0dXJuIGZ1bmN0aW9uIEJsYXp5KG9wdGlvbnMpIHtcbiAgICAgICAgLy9JRTctIGZhbGxiYWNrIGZvciBtaXNzaW5nIHF1ZXJ5U2VsZWN0b3JBbGwgc3VwcG9ydFxuICAgICAgICBpZiAoIWRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwpIHtcbiAgICAgICAgICAgIHZhciBzID0gZG9jdW1lbnQuY3JlYXRlU3R5bGVTaGVldCgpO1xuICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCA9IGZ1bmN0aW9uKHIsIGMsIGksIGosIGEpIHtcbiAgICAgICAgICAgICAgICBhID0gZG9jdW1lbnQuYWxsLCBjID0gW10sIHIgPSByLnJlcGxhY2UoL1xcW2ZvclxcYi9naSwgJ1todG1sRm9yJykuc3BsaXQoJywnKTtcbiAgICAgICAgICAgICAgICBmb3IgKGkgPSByLmxlbmd0aDsgaS0tOykge1xuICAgICAgICAgICAgICAgICAgICBzLmFkZFJ1bGUocltpXSwgJ2s6dicpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSBhLmxlbmd0aDsgai0tOykgYVtqXS5jdXJyZW50U3R5bGUuayAmJiBjLnB1c2goYVtqXSk7XG4gICAgICAgICAgICAgICAgICAgIHMucmVtb3ZlUnVsZSgwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGM7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy9vcHRpb25zIGFuZCBoZWxwZXIgdmFyc1xuICAgICAgICB2YXIgc2NvcGUgPSB0aGlzO1xuICAgICAgICB2YXIgdXRpbCA9IHNjb3BlLl91dGlsID0ge307XG4gICAgICAgIHV0aWwuZWxlbWVudHMgPSBbXTtcbiAgICAgICAgdXRpbC5kZXN0cm95ZWQgPSB0cnVlO1xuICAgICAgICBzY29wZS5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgc2NvcGUub3B0aW9ucy5lcnJvciA9IHNjb3BlLm9wdGlvbnMuZXJyb3IgfHwgZmFsc2U7XG4gICAgICAgIHNjb3BlLm9wdGlvbnMub2Zmc2V0ID0gc2NvcGUub3B0aW9ucy5vZmZzZXQgfHwgMTAwO1xuICAgICAgICBzY29wZS5vcHRpb25zLnJvb3QgPSBzY29wZS5vcHRpb25zLnJvb3QgfHwgZG9jdW1lbnQ7XG4gICAgICAgIHNjb3BlLm9wdGlvbnMuc3VjY2VzcyA9IHNjb3BlLm9wdGlvbnMuc3VjY2VzcyB8fCBmYWxzZTtcbiAgICAgICAgc2NvcGUub3B0aW9ucy5zZWxlY3RvciA9IHNjb3BlLm9wdGlvbnMuc2VsZWN0b3IgfHwgJy5iLWxhenknO1xuICAgICAgICBzY29wZS5vcHRpb25zLnNlcGFyYXRvciA9IHNjb3BlLm9wdGlvbnMuc2VwYXJhdG9yIHx8ICd8JztcbiAgICAgICAgc2NvcGUub3B0aW9ucy5jb250YWluZXJDbGFzcyA9IHNjb3BlLm9wdGlvbnMuY29udGFpbmVyO1xuICAgICAgICBzY29wZS5vcHRpb25zLmNvbnRhaW5lciA9IHNjb3BlLm9wdGlvbnMuY29udGFpbmVyQ2xhc3MgPyBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNjb3BlLm9wdGlvbnMuY29udGFpbmVyQ2xhc3MpIDogZmFsc2U7XG4gICAgICAgIHNjb3BlLm9wdGlvbnMuZXJyb3JDbGFzcyA9IHNjb3BlLm9wdGlvbnMuZXJyb3JDbGFzcyB8fCAnYi1lcnJvcic7XG4gICAgICAgIHNjb3BlLm9wdGlvbnMuYnJlYWtwb2ludHMgPSBzY29wZS5vcHRpb25zLmJyZWFrcG9pbnRzIHx8IGZhbHNlO1xuICAgICAgICBzY29wZS5vcHRpb25zLmxvYWRJbnZpc2libGUgPSBzY29wZS5vcHRpb25zLmxvYWRJbnZpc2libGUgfHwgZmFsc2U7XG4gICAgICAgIHNjb3BlLm9wdGlvbnMuc3VjY2Vzc0NsYXNzID0gc2NvcGUub3B0aW9ucy5zdWNjZXNzQ2xhc3MgfHwgJ2ItbG9hZGVkJztcbiAgICAgICAgc2NvcGUub3B0aW9ucy52YWxpZGF0ZURlbGF5ID0gc2NvcGUub3B0aW9ucy52YWxpZGF0ZURlbGF5IHx8IDI1O1xuICAgICAgICBzY29wZS5vcHRpb25zLnNhdmVWaWV3cG9ydE9mZnNldERlbGF5ID0gc2NvcGUub3B0aW9ucy5zYXZlVmlld3BvcnRPZmZzZXREZWxheSB8fCA1MDtcbiAgICAgICAgc2NvcGUub3B0aW9ucy5zcmNzZXQgPSBzY29wZS5vcHRpb25zLnNyY3NldCB8fCAnZGF0YS1zcmNzZXQnO1xuICAgICAgICBzY29wZS5vcHRpb25zLnNyYyA9IF9zb3VyY2UgPSBzY29wZS5vcHRpb25zLnNyYyB8fCAnZGF0YS1zcmMnO1xuICAgICAgICBfc3VwcG9ydENsb3Nlc3QgPSBFbGVtZW50LnByb3RvdHlwZS5jbG9zZXN0O1xuICAgICAgICBfaXNSZXRpbmEgPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA+IDE7XG4gICAgICAgIF92aWV3cG9ydCA9IHt9O1xuICAgICAgICBfdmlld3BvcnQudG9wID0gMCAtIHNjb3BlLm9wdGlvbnMub2Zmc2V0O1xuICAgICAgICBfdmlld3BvcnQubGVmdCA9IDAgLSBzY29wZS5vcHRpb25zLm9mZnNldDtcblxuXG4gICAgICAgIC8qIHB1YmxpYyBmdW5jdGlvbnNcbiAgICAgICAgICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbiAgICAgICAgc2NvcGUucmV2YWxpZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaW5pdGlhbGl6ZShzY29wZSk7XG4gICAgICAgIH07XG4gICAgICAgIHNjb3BlLmxvYWQgPSBmdW5jdGlvbihlbGVtZW50cywgZm9yY2UpIHtcbiAgICAgICAgICAgIHZhciBvcHQgPSB0aGlzLm9wdGlvbnM7XG4gICAgICAgICAgICBpZiAoZWxlbWVudHMgJiYgZWxlbWVudHMubGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBsb2FkRWxlbWVudChlbGVtZW50cywgZm9yY2UsIG9wdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVhY2goZWxlbWVudHMsIGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9hZEVsZW1lbnQoZWxlbWVudCwgZm9yY2UsIG9wdCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHNjb3BlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHsgICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciB1dGlsID0gc2NvcGUuX3V0aWw7XG4gICAgICAgICAgICBpZiAoc2NvcGUub3B0aW9ucy5jb250YWluZXIpIHtcbiAgICAgICAgICAgICAgICBlYWNoKHNjb3BlLm9wdGlvbnMuY29udGFpbmVyLCBmdW5jdGlvbihvYmplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgdW5iaW5kRXZlbnQob2JqZWN0LCAnc2Nyb2xsJywgdXRpbC52YWxpZGF0ZVQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdW5iaW5kRXZlbnQod2luZG93LCAnc2Nyb2xsJywgdXRpbC52YWxpZGF0ZVQpO1xuICAgICAgICAgICAgdW5iaW5kRXZlbnQod2luZG93LCAncmVzaXplJywgdXRpbC52YWxpZGF0ZVQpO1xuICAgICAgICAgICAgdW5iaW5kRXZlbnQod2luZG93LCAncmVzaXplJywgdXRpbC5zYXZlVmlld3BvcnRPZmZzZXRUKTtcbiAgICAgICAgICAgIHV0aWwuY291bnQgPSAwO1xuICAgICAgICAgICAgdXRpbC5lbGVtZW50cy5sZW5ndGggPSAwO1xuICAgICAgICAgICAgdXRpbC5kZXN0cm95ZWQgPSB0cnVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vdGhyb3R0bGUsIGVuc3VyZXMgdGhhdCB3ZSBkb24ndCBjYWxsIHRoZSBmdW5jdGlvbnMgdG9vIG9mdGVuXG4gICAgICAgIHV0aWwudmFsaWRhdGVUID0gdGhyb3R0bGUoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YWxpZGF0ZShzY29wZSk7XG4gICAgICAgIH0sIHNjb3BlLm9wdGlvbnMudmFsaWRhdGVEZWxheSwgc2NvcGUpO1xuICAgICAgICB1dGlsLnNhdmVWaWV3cG9ydE9mZnNldFQgPSB0aHJvdHRsZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHNhdmVWaWV3cG9ydE9mZnNldChzY29wZS5vcHRpb25zLm9mZnNldCk7XG4gICAgICAgIH0sIHNjb3BlLm9wdGlvbnMuc2F2ZVZpZXdwb3J0T2Zmc2V0RGVsYXksIHNjb3BlKTtcbiAgICAgICAgc2F2ZVZpZXdwb3J0T2Zmc2V0KHNjb3BlLm9wdGlvbnMub2Zmc2V0KTtcblxuICAgICAgICAvL2hhbmRsZSBtdWx0aS1zZXJ2ZWQgaW1hZ2Ugc3JjIChvYnNvbGV0ZSlcbiAgICAgICAgZWFjaChzY29wZS5vcHRpb25zLmJyZWFrcG9pbnRzLCBmdW5jdGlvbihvYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChvYmplY3Qud2lkdGggPj0gd2luZG93LnNjcmVlbi53aWR0aCkge1xuICAgICAgICAgICAgICAgIF9zb3VyY2UgPSBvYmplY3Quc3JjO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gc3RhcnQgbGF6eSBsb2FkXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpbml0aWFsaXplKHNjb3BlKTtcbiAgICAgICAgfSk7IC8vIFwiZG9tIHJlYWR5XCIgZml4XG5cbiAgICB9O1xuXG5cbiAgICAvKiBQcml2YXRlIGhlbHBlciBmdW5jdGlvbnNcbiAgICAgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuICAgIGZ1bmN0aW9uIGluaXRpYWxpemUoc2VsZikge1xuICAgICAgICB2YXIgdXRpbCA9IHNlbGYuX3V0aWw7XG4gICAgICAgIC8vIEZpcnN0IHdlIGNyZWF0ZSBhbiBhcnJheSBvZiBlbGVtZW50cyB0byBsYXp5IGxvYWRcbiAgICAgICAgdXRpbC5lbGVtZW50cyA9IHRvQXJyYXkoc2VsZi5vcHRpb25zKTtcbiAgICAgICAgdXRpbC5jb3VudCA9IHV0aWwuZWxlbWVudHMubGVuZ3RoO1xuICAgICAgICAvLyBUaGVuIHdlIGJpbmQgcmVzaXplIGFuZCBzY3JvbGwgZXZlbnRzIGlmIG5vdCBhbHJlYWR5IGJpbmRlZFxuICAgICAgICBpZiAodXRpbC5kZXN0cm95ZWQpIHtcbiAgICAgICAgICAgIHV0aWwuZGVzdHJveWVkID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAoc2VsZi5vcHRpb25zLmNvbnRhaW5lcikge1xuICAgICAgICAgICAgICAgIGVhY2goc2VsZi5vcHRpb25zLmNvbnRhaW5lciwgZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGJpbmRFdmVudChvYmplY3QsICdzY3JvbGwnLCB1dGlsLnZhbGlkYXRlVCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBiaW5kRXZlbnQod2luZG93LCAncmVzaXplJywgdXRpbC5zYXZlVmlld3BvcnRPZmZzZXRUKTtcbiAgICAgICAgICAgIGJpbmRFdmVudCh3aW5kb3csICdyZXNpemUnLCB1dGlsLnZhbGlkYXRlVCk7XG4gICAgICAgICAgICBiaW5kRXZlbnQod2luZG93LCAnc2Nyb2xsJywgdXRpbC52YWxpZGF0ZVQpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFuZCBmaW5hbGx5LCB3ZSBzdGFydCB0byBsYXp5IGxvYWQuXG4gICAgICAgIHZhbGlkYXRlKHNlbGYpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlKHNlbGYpIHtcbiAgICAgICAgdmFyIHV0aWwgPSBzZWxmLl91dGlsO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHV0aWwuY291bnQ7IGkrKykge1xuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSB1dGlsLmVsZW1lbnRzW2ldO1xuICAgICAgICAgICAgaWYgKGVsZW1lbnRJblZpZXcoZWxlbWVudCwgc2VsZi5vcHRpb25zKSB8fCBoYXNDbGFzcyhlbGVtZW50LCBzZWxmLm9wdGlvbnMuc3VjY2Vzc0NsYXNzKSkge1xuICAgICAgICAgICAgICAgIHNlbGYubG9hZChlbGVtZW50KTtcbiAgICAgICAgICAgICAgICB1dGlsLmVsZW1lbnRzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICB1dGlsLmNvdW50LS07XG4gICAgICAgICAgICAgICAgaS0tO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh1dGlsLmNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVsZW1lbnRJblZpZXcoZWxlLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciByZWN0ID0gZWxlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgICAgIGlmKG9wdGlvbnMuY29udGFpbmVyICYmIF9zdXBwb3J0Q2xvc2VzdCl7XG4gICAgICAgICAgICAvLyBJcyBlbGVtZW50IGluc2lkZSBhIGNvbnRhaW5lcj9cbiAgICAgICAgICAgIHZhciBlbGVtZW50Q29udGFpbmVyID0gZWxlLmNsb3Nlc3Qob3B0aW9ucy5jb250YWluZXJDbGFzcyk7XG4gICAgICAgICAgICBpZihlbGVtZW50Q29udGFpbmVyKXtcbiAgICAgICAgICAgICAgICB2YXIgY29udGFpbmVyUmVjdCA9IGVsZW1lbnRDb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICAgICAgLy8gSXMgY29udGFpbmVyIGluIHZpZXc/XG4gICAgICAgICAgICAgICAgaWYoaW5WaWV3KGNvbnRhaW5lclJlY3QsIF92aWV3cG9ydCkpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgdG9wID0gY29udGFpbmVyUmVjdC50b3AgLSBvcHRpb25zLm9mZnNldDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJpZ2h0ID0gY29udGFpbmVyUmVjdC5yaWdodCArIG9wdGlvbnMub2Zmc2V0O1xuICAgICAgICAgICAgICAgICAgICB2YXIgYm90dG9tID0gY29udGFpbmVyUmVjdC5ib3R0b20gKyBvcHRpb25zLm9mZnNldDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxlZnQgPSBjb250YWluZXJSZWN0LmxlZnQgLSBvcHRpb25zLm9mZnNldDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnRhaW5lclJlY3RXaXRoT2Zmc2V0ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdG9wOiB0b3AgPiBfdmlld3BvcnQudG9wID8gdG9wIDogX3ZpZXdwb3J0LnRvcCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJpZ2h0OiByaWdodCA8IF92aWV3cG9ydC5yaWdodCA/IHJpZ2h0IDogX3ZpZXdwb3J0LnJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgYm90dG9tOiBib3R0b20gPCBfdmlld3BvcnQuYm90dG9tID8gYm90dG9tIDogX3ZpZXdwb3J0LmJvdHRvbSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IGxlZnQgPiBfdmlld3BvcnQubGVmdCA/IGxlZnQgOiBfdmlld3BvcnQubGVmdFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAvLyBJcyBlbGVtZW50IGluIHZpZXcgb2YgY29udGFpbmVyP1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW5WaWV3KHJlY3QsIGNvbnRhaW5lclJlY3RXaXRoT2Zmc2V0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9ICAgICAgXG4gICAgICAgIHJldHVybiBpblZpZXcocmVjdCwgX3ZpZXdwb3J0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpblZpZXcocmVjdCwgdmlld3BvcnQpe1xuICAgICAgICAvLyBJbnRlcnNlY3Rpb25cbiAgICAgICAgcmV0dXJuIHJlY3QucmlnaHQgPj0gdmlld3BvcnQubGVmdCAmJlxuICAgICAgICAgICAgICAgcmVjdC5ib3R0b20gPj0gdmlld3BvcnQudG9wICYmIFxuICAgICAgICAgICAgICAgcmVjdC5sZWZ0IDw9IHZpZXdwb3J0LnJpZ2h0ICYmIFxuICAgICAgICAgICAgICAgcmVjdC50b3AgPD0gdmlld3BvcnQuYm90dG9tO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxvYWRFbGVtZW50KGVsZSwgZm9yY2UsIG9wdGlvbnMpIHtcbiAgICAgICAgLy8gaWYgZWxlbWVudCBpcyB2aXNpYmxlLCBub3QgbG9hZGVkIG9yIGZvcmNlZFxuICAgICAgICBpZiAoIWhhc0NsYXNzKGVsZSwgb3B0aW9ucy5zdWNjZXNzQ2xhc3MpICYmIChmb3JjZSB8fCBvcHRpb25zLmxvYWRJbnZpc2libGUgfHwgKGVsZS5vZmZzZXRXaWR0aCA+IDAgJiYgZWxlLm9mZnNldEhlaWdodCA+IDApKSkge1xuICAgICAgICAgICAgdmFyIGRhdGFTcmMgPSBnZXRBdHRyKGVsZSwgX3NvdXJjZSkgfHwgZ2V0QXR0cihlbGUsIG9wdGlvbnMuc3JjKTsgLy8gZmFsbGJhY2sgdG8gZGVmYXVsdCAnZGF0YS1zcmMnXG4gICAgICAgICAgICBpZiAoZGF0YVNyYykge1xuICAgICAgICAgICAgICAgIHZhciBkYXRhU3JjU3BsaXR0ZWQgPSBkYXRhU3JjLnNwbGl0KG9wdGlvbnMuc2VwYXJhdG9yKTtcbiAgICAgICAgICAgICAgICB2YXIgc3JjID0gZGF0YVNyY1NwbGl0dGVkW19pc1JldGluYSAmJiBkYXRhU3JjU3BsaXR0ZWQubGVuZ3RoID4gMSA/IDEgOiAwXTtcbiAgICAgICAgICAgICAgICB2YXIgc3Jjc2V0ID0gZ2V0QXR0cihlbGUsIG9wdGlvbnMuc3Jjc2V0KTtcbiAgICAgICAgICAgICAgICB2YXIgaXNJbWFnZSA9IGVxdWFsKGVsZSwgJ2ltZycpO1xuICAgICAgICAgICAgICAgIHZhciBwYXJlbnQgPSBlbGUucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICB2YXIgaXNQaWN0dXJlID0gcGFyZW50ICYmIGVxdWFsKHBhcmVudCwgJ3BpY3R1cmUnKTtcbiAgICAgICAgICAgICAgICAvLyBJbWFnZSBvciBiYWNrZ3JvdW5kIGltYWdlXG4gICAgICAgICAgICAgICAgaWYgKGlzSW1hZ2UgfHwgZWxlLnNyYyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpbWcgPSBuZXcgSW1hZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gdXNpbmcgRXZlbnRMaXN0ZW5lciBpbnN0ZWFkIG9mIG9uZXJyb3IgYW5kIG9ubG9hZFxuICAgICAgICAgICAgICAgICAgICAvLyBkdWUgdG8gYnVnIGludHJvZHVjZWQgaW4gY2hyb21lIHY1MCBcbiAgICAgICAgICAgICAgICAgICAgLy8gKGh0dHBzOi8vcHJvZHVjdGZvcnVtcy5nb29nbGUuY29tL2ZvcnVtLyMhdG9waWMvY2hyb21lL3A1MUxrN3ZuUDJvKVxuICAgICAgICAgICAgICAgICAgICB2YXIgb25FcnJvckhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmVycm9yKSBvcHRpb25zLmVycm9yKGVsZSwgXCJpbnZhbGlkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYWRkQ2xhc3MoZWxlLCBvcHRpb25zLmVycm9yQ2xhc3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdW5iaW5kRXZlbnQoaW1nLCAnZXJyb3InLCBvbkVycm9ySGFuZGxlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB1bmJpbmRFdmVudChpbWcsICdsb2FkJywgb25Mb2FkSGFuZGxlcik7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHZhciBvbkxvYWRIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJcyBlbGVtZW50IGFuIGltYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNJbWFnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKCFpc1BpY3R1cmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlU291cmNlcyhlbGUsIHNyYywgc3Jjc2V0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBvciBiYWNrZ3JvdW5kLWltYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZS5zdHlsZS5iYWNrZ3JvdW5kSW1hZ2UgPSAndXJsKFwiJyArIHNyYyArICdcIiknO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbUxvYWRlZChlbGUsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdW5iaW5kRXZlbnQoaW1nLCAnbG9hZCcsIG9uTG9hZEhhbmRsZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdW5iaW5kRXZlbnQoaW1nLCAnZXJyb3InLCBvbkVycm9ySGFuZGxlcik7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBQaWN0dXJlIGVsZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzUGljdHVyZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW1nID0gZWxlOyAvLyBJbWFnZSB0YWcgaW5zaWRlIHBpY3R1cmUgZWxlbWVudCB3b250IGdldCBwcmVsb2FkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGVhY2gocGFyZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzb3VyY2UnKSwgZnVuY3Rpb24oc291cmNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlU291cmNlKHNvdXJjZSwgX2F0dHJTcmNzZXQsIG9wdGlvbnMuc3Jjc2V0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJpbmRFdmVudChpbWcsICdlcnJvcicsIG9uRXJyb3JIYW5kbGVyKTtcbiAgICAgICAgICAgICAgICAgICAgYmluZEV2ZW50KGltZywgJ2xvYWQnLCBvbkxvYWRIYW5kbGVyKTtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlU291cmNlcyhpbWcsIHNyYywgc3Jjc2V0KTsgLy8gUHJlbG9hZFxuXG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgLy8gQW4gaXRlbSB3aXRoIHNyYyBsaWtlIGlmcmFtZSwgdW5pdHkgZ2FtZXMsIHNpbXBlbCB2aWRlbyBldGNcbiAgICAgICAgICAgICAgICAgICAgZWxlLnNyYyA9IHNyYztcbiAgICAgICAgICAgICAgICAgICAgaXRlbUxvYWRlZChlbGUsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gdmlkZW8gd2l0aCBjaGlsZCBzb3VyY2VcbiAgICAgICAgICAgICAgICBpZiAoZXF1YWwoZWxlLCAndmlkZW8nKSkge1xuICAgICAgICAgICAgICAgICAgICBlYWNoKGVsZS5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc291cmNlJyksIGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlU291cmNlKHNvdXJjZSwgX2F0dHJTcmMsIG9wdGlvbnMuc3JjKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGVsZS5sb2FkKCk7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1Mb2FkZWQoZWxlLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5lcnJvcikgb3B0aW9ucy5lcnJvcihlbGUsIFwibWlzc2luZ1wiKTtcbiAgICAgICAgICAgICAgICAgICAgYWRkQ2xhc3MoZWxlLCBvcHRpb25zLmVycm9yQ2xhc3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGl0ZW1Mb2FkZWQoZWxlLCBvcHRpb25zKSB7XG4gICAgICAgIGFkZENsYXNzKGVsZSwgb3B0aW9ucy5zdWNjZXNzQ2xhc3MpO1xuICAgICAgICBpZiAob3B0aW9ucy5zdWNjZXNzKSBvcHRpb25zLnN1Y2Nlc3MoZWxlKTtcbiAgICAgICAgLy8gY2xlYW51cCBtYXJrdXAsIHJlbW92ZSBkYXRhIHNvdXJjZSBhdHRyaWJ1dGVzXG4gICAgICAgIHJlbW92ZUF0dHIoZWxlLCBvcHRpb25zLnNyYyk7XG4gICAgICAgIHJlbW92ZUF0dHIoZWxlLCBvcHRpb25zLnNyY3NldCk7XG4gICAgICAgIGVhY2gob3B0aW9ucy5icmVha3BvaW50cywgZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgICAgICAgICByZW1vdmVBdHRyKGVsZSwgb2JqZWN0LnNyYyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhbmRsZVNvdXJjZShlbGUsIGF0dHIsIGRhdGFBdHRyKSB7XG4gICAgICAgIHZhciBkYXRhU3JjID0gZ2V0QXR0cihlbGUsIGRhdGFBdHRyKTtcbiAgICAgICAgaWYgKGRhdGFTcmMpIHtcbiAgICAgICAgICAgIHNldEF0dHIoZWxlLCBhdHRyLCBkYXRhU3JjKTtcbiAgICAgICAgICAgIHJlbW92ZUF0dHIoZWxlLCBkYXRhQXR0cik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVTb3VyY2VzKGVsZSwgc3JjLCBzcmNzZXQpe1xuICAgICAgICBpZihzcmNzZXQpIHtcbiAgICAgICAgICAgIHNldEF0dHIoZWxlLCBfYXR0clNyY3NldCwgc3Jjc2V0KTsgLy9zcmNzZXRcbiAgICAgICAgfVxuICAgICAgICBlbGUuc3JjID0gc3JjOyAvL3NyYyBcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRBdHRyKGVsZSwgYXR0ciwgdmFsdWUpe1xuICAgICAgICBlbGUuc2V0QXR0cmlidXRlKGF0dHIsIHZhbHVlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRBdHRyKGVsZSwgYXR0cikge1xuICAgICAgICByZXR1cm4gZWxlLmdldEF0dHJpYnV0ZShhdHRyKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZW1vdmVBdHRyKGVsZSwgYXR0cil7XG4gICAgICAgIGVsZS5yZW1vdmVBdHRyaWJ1dGUoYXR0cik7IFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVxdWFsKGVsZSwgc3RyKSB7XG4gICAgICAgIHJldHVybiBlbGUubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gc3RyO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhc0NsYXNzKGVsZSwgY2xhc3NOYW1lKSB7XG4gICAgICAgIHJldHVybiAoJyAnICsgZWxlLmNsYXNzTmFtZSArICcgJykuaW5kZXhPZignICcgKyBjbGFzc05hbWUgKyAnICcpICE9PSAtMTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhZGRDbGFzcyhlbGUsIGNsYXNzTmFtZSkge1xuICAgICAgICBpZiAoIWhhc0NsYXNzKGVsZSwgY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgZWxlLmNsYXNzTmFtZSArPSAnICcgKyBjbGFzc05hbWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0b0FycmF5KG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIGFycmF5ID0gW107XG4gICAgICAgIHZhciBub2RlbGlzdCA9IChvcHRpb25zLnJvb3QpLnF1ZXJ5U2VsZWN0b3JBbGwob3B0aW9ucy5zZWxlY3Rvcik7XG4gICAgICAgIGZvciAodmFyIGkgPSBub2RlbGlzdC5sZW5ndGg7IGktLTsgYXJyYXkudW5zaGlmdChub2RlbGlzdFtpXSkpIHt9XG4gICAgICAgIHJldHVybiBhcnJheTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzYXZlVmlld3BvcnRPZmZzZXQob2Zmc2V0KSB7XG4gICAgICAgIF92aWV3cG9ydC5ib3R0b20gPSAod2luZG93LmlubmVySGVpZ2h0IHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQpICsgb2Zmc2V0O1xuICAgICAgICBfdmlld3BvcnQucmlnaHQgPSAod2luZG93LmlubmVyV2lkdGggfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoKSArIG9mZnNldDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBiaW5kRXZlbnQoZWxlLCB0eXBlLCBmbikge1xuICAgICAgICBpZiAoZWxlLmF0dGFjaEV2ZW50KSB7XG4gICAgICAgICAgICBlbGUuYXR0YWNoRXZlbnQgJiYgZWxlLmF0dGFjaEV2ZW50KCdvbicgKyB0eXBlLCBmbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbGUuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBmbiwgeyBjYXB0dXJlOiBmYWxzZSwgcGFzc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVuYmluZEV2ZW50KGVsZSwgdHlwZSwgZm4pIHtcbiAgICAgICAgaWYgKGVsZS5kZXRhY2hFdmVudCkge1xuICAgICAgICAgICAgZWxlLmRldGFjaEV2ZW50ICYmIGVsZS5kZXRhY2hFdmVudCgnb24nICsgdHlwZSwgZm4pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWxlLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgZm4sIHsgY2FwdHVyZTogZmFsc2UsIHBhc3NpdmU6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlYWNoKG9iamVjdCwgZm4pIHtcbiAgICAgICAgaWYgKG9iamVjdCAmJiBmbikge1xuICAgICAgICAgICAgdmFyIGwgPSBvYmplY3QubGVuZ3RoO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsICYmIGZuKG9iamVjdFtpXSwgaSkgIT09IGZhbHNlOyBpKyspIHt9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0aHJvdHRsZShmbiwgbWluRGVsYXksIHNjb3BlKSB7XG4gICAgICAgIHZhciBsYXN0Q2FsbCA9IDA7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBub3cgPSArbmV3IERhdGUoKTtcbiAgICAgICAgICAgIGlmIChub3cgLSBsYXN0Q2FsbCA8IG1pbkRlbGF5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGFzdENhbGwgPSBub3c7XG4gICAgICAgICAgICBmbi5hcHBseShzY29wZSwgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcbiAgICB9XG59KTtcbiIsIid1c2Ugc3RyaWN0J1xuXG5pbXBvcnQgQmxhenkgZnJvbSAnYmxhenknXG5cbmxldCBpbml0QmxhenkgPSAoKSA9PiB7XG4gIGxldCBibGF6eSA9IG5ldyBCbGF6eSh7XG4gICAgc2VsZWN0b3I6ICcubGF6eScsXG4gICAgc3VjY2Vzc0NsYXNzOiAnbGF6eUxvYWRlZCcsXG4gICAgZXJyb3JDbGFzczogJ2xhenlFcm9ycicsXG4gICAgZXJyb3I6IChlbGUsIG1zZykgPT4ge1xuICAgICAgY29uc29sZS5sb2coJ2xhenlsb2FkIGVycm9yOiAnLCBlbGUsIG1zZylcbiAgICB9LFxuICAgIHN1Y2Nlc3M6IChlbGUsIG1zZykgPT4ge1xuICAgICAgbGV0IHBhcmVudCA9IGVsZS5wYXJlbnROb2RlXG4gICAgICBwYXJlbnQuY2xhc3NOYW1lICs9ICcgaGFzTGF6eUxvYWRlZCdcbiAgICB9XG4gIH0pXG59XG5cbmV4cG9ydCBkZWZhdWx0IGluaXRCbGF6eVxuIiwiJ3VzZSBzdHJpY3QnXG5cbi8vIEltcG9ydHNcbmltcG9ydCBpbml0QmxhenkgZnJvbSAnLi9tb2R1bGVzL2JsYXp5J1xuXG4vLyBEb2N1bWVudCBzdGF0ZXNcbmRvY3VtZW50Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdpbnRlcmFjdGl2ZScpIHtcbiAgICBjb25zb2xlLmxvZygnUGFnZSBpbnRlcmFjdGl2ZScpXG4gIH1cblxuICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2NvbXBsZXRlJykge1xuICAgIGNvbnNvbGUubG9nKCdQYWdlIHJlYWR5JylcblxuICAgIC8vIEluaXRpYWxpemUgbGF6eWxvYWRcbiAgICBpbml0QmxhenkoKVxuICB9XG59XG4iXX0=

define('famous/inputs/Accumulator', ['require', 'exports', 'module', 'famous/core/EventHandler', 'famous/transitions/Transitionable'], function(require, exports, module) {
    var EventHandler = require('famous/core/EventHandler');
    var Transitionable = require('famous/transitions/Transitionable');

    /**
     * Accumulates differentials of event sources that emit a `delta`
     *  attribute taking a Number or Array of Number types. The accumulated
     *  value is stored in a getter/setter.
     *
     * @class Accumulator
     * @constructor
     * @param value {Number|Array|Transitionable}   Initializing value
     * @param [eventName='update'] {String}         Name of update event
     */
    function Accumulator(value, eventName) {
        if (eventName === undefined) eventName = 'update';

        this._state = (value && value.get && value.set) ? value : new Transitionable(value || 0);

        this._eventInput = new EventHandler();
        EventHandler.setInputHandler(this, this._eventInput);

        this._eventInput.on(eventName, _handleUpdate.bind(this));
    }

    function _handleUpdate(data) {
        var delta = data.delta;
        var state = this.get();

        if (delta.constructor === state.constructor) {
            var newState = (delta instanceof Array) ? [state[0] + delta[0], state[1] + delta[1]] : state + delta;
            this.set(newState);
        }
    }

    /**
     * Basic getter
     *
     * @method get
     * @return {Number|Array} current value
     */
    Accumulator.prototype.get = function get() {
        return this._state.get();
    };

    /**
     * Basic setter
     *
     * @method set
     * @param value {Number|Array} new value
     */
    Accumulator.prototype.set = function set(value) {
        this._state.set(value);
    };

    module.exports = Accumulator;
});

define('famous/inputs/DesktopEmulationMode', ['require', 'exports', 'module'], function(require, exports, module) {
    var hasTouch = 'ontouchstart' in window;

    function kill(type) {
        window.addEventListener(type, function(event) {
            event.stopPropagation();
            return false;
        }, true);
    }

    if (hasTouch) {
        kill('mousedown');
        kill('mousemove');
        kill('mouseup');
        kill('mouseleave');
    }
});



/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/inputs/MouseSync', ['require', 'exports', 'module', 'famous/core/EventHandler'], function(require, exports, module) {
    var EventHandler = require('famous/core/EventHandler');

    /**
     * Handles piped in mouse drag events. Outputs an object with two
     *   properties, position and velocity.
     *   Emits 'start', 'update' and 'end' events with DOM event passthroughs,
     *   with position, velocity, and a delta key.
     *
     * @class MouseSync
     * @constructor
     *
     * @param [options] {Object}             default options overrides
     * @param [options.direction] {Number}   read from a particular axis
     * @param [options.rails] {Boolean}      read from axis with greatest differential
     * @param [options.propogate] {Boolean}  add listened to document on mouseleave
     */
    function MouseSync(options) {
        this.options = Object.create(MouseSync.DEFAULT_OPTIONS);
        if (options) this.setOptions(options);

        this._eventInput = new EventHandler();
        this._eventOutput = new EventHandler();

        EventHandler.setInputHandler(this, this._eventInput);
        EventHandler.setOutputHandler(this, this._eventOutput);

        this._eventInput.on('mousedown', _handleStart.bind(this));
        this._eventInput.on('mousemove', _handleMove.bind(this));
        this._eventInput.on('mouseup', _handleEnd.bind(this));

        if (this.options.propogate) this._eventInput.on('mouseleave', _handleLeave.bind(this));
        else this._eventInput.on('mouseleave', _handleEnd.bind(this));

        this._payload = {
            delta: null,
            position: null,
            velocity: null,
            clientX: 0,
            clientY: 0,
            offsetX: 0,
            offsetY: 0
        };

        this._position = null; // to be deprecated
        this._prevCoord = undefined;
        this._prevTime = undefined;
        this._down = false;
        this._moved = false;
    }

    MouseSync.DEFAULT_OPTIONS = {
        direction: undefined,
        rails: false,
        scale: 1,
        propogate: true // events piped to document on mouseleave
    };

    MouseSync.DIRECTION_X = 0;
    MouseSync.DIRECTION_Y = 1;

    var MINIMUM_TICK_TIME = 8;

    var _now = Date.now;

    function _handleStart(event) {
        var delta;
        var velocity;
        event.preventDefault(); // prevent drag

        var x = event.clientX;
        var y = event.clientY;

        this._prevCoord = [x, y];
        this._prevTime = _now();
        this._down = true;
        this._move = false;

        if (this.options.direction !== undefined) {
            this._position = 0;
            delta = 0;
            velocity = 0;
        } else {
            this._position = [0, 0];
            delta = [0, 0];
            velocity = [0, 0];
        }

        var payload = this._payload;
        payload.delta = delta;
        payload.position = this._position;
        payload.velocity = velocity;
        payload.clientX = x;
        payload.clientY = y;
        payload.offsetX = event.offsetX;
        payload.offsetY = event.offsetY;

        this._eventOutput.emit('start', payload);
    }

    function _handleMove(event) {
        if (!this._prevCoord) return;

        var prevCoord = this._prevCoord;
        var prevTime = this._prevTime;

        var x = event.clientX;
        var y = event.clientY;

        var currTime = _now();

        var diffX = x - prevCoord[0];
        var diffY = y - prevCoord[1];

        if (this.options.rails) {
            if (Math.abs(diffX) > Math.abs(diffY)) diffY = 0;
            else diffX = 0;
        }

        var diffTime = Math.max(currTime - prevTime, MINIMUM_TICK_TIME); // minimum tick time

        var velX = diffX / diffTime;
        var velY = diffY / diffTime;

        var scale = this.options.scale;
        var nextVel;
        var nextDelta;

        if (this.options.direction === MouseSync.DIRECTION_X) {
            nextDelta = scale * diffX;
            nextVel = scale * velX;
            this._position += nextDelta;
        } else if (this.options.direction === MouseSync.DIRECTION_Y) {
            nextDelta = scale * diffY;
            nextVel = scale * velY;
            this._position += nextDelta;
        } else {
            nextDelta = [scale * diffX, scale * diffY];
            nextVel = [scale * velX, scale * velY];
            this._position[0] += nextDelta[0];
            this._position[1] += nextDelta[1];
        }

        var payload = this._payload;
        payload.delta = nextDelta;
        payload.position = this._position;
        payload.velocity = nextVel;
        payload.clientX = x;
        payload.clientY = y;
        payload.offsetX = event.offsetX;
        payload.offsetY = event.offsetY;

        this._eventOutput.emit('update', payload);

        this._prevCoord = [x, y];
        this._prevTime = currTime;
        this._move = true;
    }

    function _handleEnd(event) {
        if (!this._down) return;

        this._eventOutput.emit('end', this._payload);
        this._prevCoord = undefined;
        this._prevTime = undefined;
        this._down = false;
        this._move = false;
    }

    function _handleLeave(event) {
        if (!this._down || !this._move) return;

        var boundMove = _handleMove.bind(this);
        var boundEnd = function(event) {
            _handleEnd.call(this, event);
            document.removeEventListener('mousemove', boundMove);
            document.removeEventListener('mouseup', boundEnd);
        }.bind(this, event);

        document.addEventListener('mousemove', boundMove);
        document.addEventListener('mouseup', boundEnd);
    }

    /**
     * Return entire options dictionary, including defaults.
     *
     * @method getOptions
     * @return {Object} configuration options
     */
    MouseSync.prototype.getOptions = function getOptions() {
        return this.options;
    };

    /**
     * Set internal options, overriding any default options
     *
     * @method setOptions
     *
     * @param [options] {Object}             default options overrides
     * @param [options.direction] {Number}   read from a particular axis
     * @param [options.rails] {Boolean}      read from axis with greatest differential
     * @param [options.propogate] {Boolean}  add listened to document on mouseleave
     */
    MouseSync.prototype.setOptions = function setOptions(options) {
        if (options.direction !== undefined) this.options.direction = options.direction;
        if (options.rails !== undefined) this.options.rails = options.rails;
        if (options.scale !== undefined) this.options.scale = options.scale;
        if (options.propogate !== undefined) this.options.propogate = options.propogate;
    };

    module.exports = MouseSync;
});




/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/inputs/FastClick', ['require', 'exports', 'module'], function(require, exports, module) {
    /**
     * FastClick is an override shim which maps event pairs of
     *   'touchstart' and 'touchend' which differ by less than a certain
     *   threshold to the 'click' event.
     *   This is used to speed up clicks on some browsers.
     */
    if (!window.CustomEvent) return;
    var clickThreshold = 300;
    var clickWindow = 500;
    var potentialClicks = {};
    var recentlyDispatched = {};
    var _now = Date.now;

    window.addEventListener('touchstart', function(event) {
        var timestamp = _now();
        for (var i = 0; i < event.changedTouches.length; i++) {
            var touch = event.changedTouches[i];
            potentialClicks[touch.identifier] = timestamp;
        }
    });

    window.addEventListener('touchmove', function(event) {
        for (var i = 0; i < event.changedTouches.length; i++) {
            var touch = event.changedTouches[i];
            delete potentialClicks[touch.identifier];
        }
    });

    window.addEventListener('touchend', function(event) {
        var currTime = _now();
        for (var i = 0; i < event.changedTouches.length; i++) {
            var touch = event.changedTouches[i];
            var startTime = potentialClicks[touch.identifier];
            if (startTime && currTime - startTime < clickThreshold) {
                var clickEvt = new window.CustomEvent('click', {
                    'bubbles': true,
                    'details': touch
                });
                recentlyDispatched[currTime] = event;
                event.target.dispatchEvent(clickEvt);
            }
            delete potentialClicks[touch.identifier];
        }
    });

    window.addEventListener('click', function(event) {
        var currTime = _now();
        for (var i in recentlyDispatched) {
            var previousEvent = recentlyDispatched[i];
            if (currTime - i < clickWindow) {
                if (event instanceof window.MouseEvent && event.target === previousEvent.target) event.stopPropagation();
            } else delete recentlyDispatched[i];
        }
    }, true);
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/inputs/TwoFingerSync', ['require', 'exports', 'module', 'famous/core/EventHandler'], function(require, exports, module) {
    var EventHandler = require('famous/core/EventHandler');

    /**
     * Helper to PinchSync, RotateSync, and ScaleSync.  Generalized handling of
     *   two-finger touch events.
     *   This class is meant to be overridden and not used directly.
     *
     * @class TwoFingerSync
     * @constructor
     */
    function TwoFingerSync() {
        this._eventInput = new EventHandler();
        this._eventOutput = new EventHandler();

        EventHandler.setInputHandler(this, this._eventInput);
        EventHandler.setOutputHandler(this, this._eventOutput);

        this.touchAEnabled = false;
        this.touchAId = 0;
        this.posA = null;
        this.timestampA = 0;
        this.touchBEnabled = false;
        this.touchBId = 0;
        this.posB = null;
        this.timestampB = 0;

        this._eventInput.on('touchstart', this.handleStart.bind(this));
        this._eventInput.on('touchmove', this.handleMove.bind(this));
        this._eventInput.on('touchend', this.handleEnd.bind(this));
        this._eventInput.on('touchcancel', this.handleEnd.bind(this));
    }

    TwoFingerSync.calculateAngle = function(posA, posB) {
        var diffX = posB[0] - posA[0];
        var diffY = posB[1] - posA[1];
        return Math.atan2(diffY, diffX);
    };

    TwoFingerSync.calculateDistance = function(posA, posB) {
        var diffX = posB[0] - posA[0];
        var diffY = posB[1] - posA[1];
        return Math.sqrt(diffX * diffX + diffY * diffY);
    };

    TwoFingerSync.calculateCenter = function(posA, posB) {
        return [(posA[0] + posB[0]) / 2.0, (posA[1] + posB[1]) / 2.0];
    };

    var _now = Date.now;

    // private
    TwoFingerSync.prototype.handleStart = function handleStart(event) {
        for (var i = 0; i < event.changedTouches.length; i++) {
            var touch = event.changedTouches[i];
            if (!this.touchAEnabled) {
                this.touchAId = touch.identifier;
                this.touchAEnabled = true;
                this.posA = [touch.pageX, touch.pageY];
                this.timestampA = _now();
            } else if (!this.touchBEnabled) {
                this.touchBId = touch.identifier;
                this.touchBEnabled = true;
                this.posB = [touch.pageX, touch.pageY];
                this.timestampB = _now();
                this._startUpdate(event);
            }
        }
    };

    // private
    TwoFingerSync.prototype.handleMove = function handleMove(event) {
        if (!(this.touchAEnabled && this.touchBEnabled)) return;
        var prevTimeA = this.timestampA;
        var prevTimeB = this.timestampB;
        var diffTime;
        for (var i = 0; i < event.changedTouches.length; i++) {
            var touch = event.changedTouches[i];
            if (touch.identifier === this.touchAId) {
                this.posA = [touch.pageX, touch.pageY];
                this.timestampA = _now();
                diffTime = this.timestampA - prevTimeA;
            } else if (touch.identifier === this.touchBId) {
                this.posB = [touch.pageX, touch.pageY];
                this.timestampB = _now();
                diffTime = this.timestampB - prevTimeB;
            }
        }
        if (diffTime) this._moveUpdate(diffTime);
    };

    // private
    TwoFingerSync.prototype.handleEnd = function handleEnd(event) {
        for (var i = 0; i < event.changedTouches.length; i++) {
            var touch = event.changedTouches[i];
            if (touch.identifier === this.touchAId || touch.identifier === this.touchBId) {
                if (this.touchAEnabled && this.touchBEnabled) {
                    this._eventOutput.emit('end', {
                        touches: [this.touchAId, this.touchBId],
                        angle: this._angle
                    });
                }
                this.touchAEnabled = false;
                this.touchAId = 0;
                this.touchBEnabled = false;
                this.touchBId = 0;
            }
        }
    };

    module.exports = TwoFingerSync;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/inputs/PinchSync', ['require', 'exports', 'module', './TwoFingerSync'], function(require, exports, module) {
    var TwoFingerSync = require('./TwoFingerSync');

    /**
     * Handles piped in two-finger touch events to change position via pinching / expanding.
     *   Emits 'start', 'update' and 'end' events with
     *   position, velocity, touch ids, and distance between fingers.
     *
     * @class PinchSync
     * @extends TwoFingerSync
     * @constructor
     * @param {Object} options default options overrides
     * @param {Number} [options.scale] scale velocity by this factor
     */
    function PinchSync(options) {
        TwoFingerSync.call(this);

        this.options = Object.create(PinchSync.DEFAULT_OPTIONS);
        if (options) this.setOptions(options);

        this._displacement = 0;
        this._previousDistance = 0;
    }

    PinchSync.prototype = Object.create(TwoFingerSync.prototype);
    PinchSync.prototype.constructor = PinchSync;

    PinchSync.DEFAULT_OPTIONS = {
        scale: 1
    };

    PinchSync.prototype._startUpdate = function _startUpdate(event) {
        this._previousDistance = TwoFingerSync.calculateDistance(this.posA, this.posB);
        this._displacement = 0;

        this._eventOutput.emit('start', {
            count: event.touches.length,
            touches: [this.touchAId, this.touchBId],
            distance: this._dist,
            center: TwoFingerSync.calculateCenter(this.posA, this.posB)
        });
    };

    PinchSync.prototype._moveUpdate = function _moveUpdate(diffTime) {
        var currDist = TwoFingerSync.calculateDistance(this.posA, this.posB);
        var center = TwoFingerSync.calculateCenter(this.posA, this.posB);

        var scale = this.options.scale;
        var delta = scale * (currDist - this._previousDistance);
        var velocity = delta / diffTime;

        this._previousDistance = currDist;
        this._displacement += delta;

        this._eventOutput.emit('update', {
            delta: delta,
            velocity: velocity,
            distance: currDist,
            displacement: this._displacement,
            center: center,
            touches: [this.touchAId, this.touchBId]
        });
    };

    /**
     * Return entire options dictionary, including defaults.
     *
     * @method getOptions
     * @return {Object} configuration options
     */
    PinchSync.prototype.getOptions = function getOptions() {
        return this.options;
    };

    /**
     * Set internal options, overriding any default options
     *
     * @method setOptions
     *
     * @param {Object} [options] overrides of default options
     * @param {Number} [options.scale] scale velocity by this factor
     */
    PinchSync.prototype.setOptions = function setOptions(options) {
        if (options.scale !== undefined) this.options.scale = options.scale;
    };

    module.exports = PinchSync;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/inputs/RotateSync', ['require', 'exports', 'module', './TwoFingerSync'], function(require, exports, module) {
    var TwoFingerSync = require('./TwoFingerSync');

    /**
     * Handles piped in two-finger touch events to increase or decrease scale via pinching / expanding.
     *   Emits 'start', 'update' and 'end' events an object with position, velocity, touch ids, and angle.
     *   Useful for determining a rotation factor from initial two-finger touch.
     *
     * @class RotateSync
     * @extends TwoFingerSync
     * @constructor
     * @param {Object} options default options overrides
     * @param {Number} [options.scale] scale velocity by this factor
     */
    function RotateSync(options) {
        TwoFingerSync.call(this);

        this.options = Object.create(RotateSync.DEFAULT_OPTIONS);
        if (options) this.setOptions(options);

        this._angle = 0;
        this._previousAngle = 0;
    }

    RotateSync.prototype = Object.create(TwoFingerSync.prototype);
    RotateSync.prototype.constructor = RotateSync;

    RotateSync.DEFAULT_OPTIONS = {
        scale: 1
    };

    RotateSync.prototype._startUpdate = function _startUpdate(event) {
        this._angle = 0;
        this._previousAngle = TwoFingerSync.calculateAngle(this.posA, this.posB);
        var center = TwoFingerSync.calculateCenter(this.posA, this.posB);
        this._eventOutput.emit('start', {
            count: event.touches.length,
            angle: this._angle,
            center: center,
            touches: [this.touchAId, this.touchBId]
        });
    };

    RotateSync.prototype._moveUpdate = function _moveUpdate(diffTime) {
        var scale = this.options.scale;

        var currAngle = TwoFingerSync.calculateAngle(this.posA, this.posB);
        var center = TwoFingerSync.calculateCenter(this.posA, this.posB);

        var diffTheta = scale * (currAngle - this._previousAngle);
        var velTheta = diffTheta / diffTime;

        this._angle += diffTheta;

        this._eventOutput.emit('update', {
            delta: diffTheta,
            velocity: velTheta,
            angle: this._angle,
            center: center,
            touches: [this.touchAId, this.touchBId]
        });

        this._previousAngle = currAngle;
    };

    /**
     * Return entire options dictionary, including defaults.
     *
     * @method getOptions
     * @return {Object} configuration options
     */
    RotateSync.prototype.getOptions = function getOptions() {
        return this.options;
    };

    /**
     * Set internal options, overriding any default options
     *
     * @method setOptions
     *
     * @param {Object} [options] overrides of default options
     * @param {Number} [options.scale] scale velocity by this factor
     */
    RotateSync.prototype.setOptions = function setOptions(options) {
        if (options.scale !== undefined) this.options.scale = options.scale;
    };

    module.exports = RotateSync;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/inputs/ScaleSync', ['require', 'exports', 'module', './TwoFingerSync'], function(require, exports, module) {
    var TwoFingerSync = require('./TwoFingerSync');

    /**
     * Handles piped in two-finger touch events to increase or decrease scale via pinching / expanding.
     *   Emits 'start', 'update' and 'end' events an object with position, velocity, touch ids, distance, and scale factor.
     *   Useful for determining a scaling factor from initial two-finger touch.
     *
     * @class ScaleSync
     * @extends TwoFingerSync
     * @constructor
     * @param {Object} options default options overrides
     * @param {Number} [options.scale] scale velocity by this factor
     */
    function ScaleSync(options) {
        TwoFingerSync.call(this);

        this.options = Object.create(ScaleSync.DEFAULT_OPTIONS);
        if (options) this.setOptions(options);

        this._scaleFactor = 1;
        this._startDist = 0;
        this._eventInput.on('pipe', _reset.bind(this));
    }

    ScaleSync.prototype = Object.create(TwoFingerSync.prototype);
    ScaleSync.prototype.constructor = ScaleSync;

    ScaleSync.DEFAULT_OPTIONS = {
        scale: 1
    };

    function _reset() {
        this.touchAId = undefined;
        this.touchBId = undefined;
    }

    // handles initial touch of two fingers
    ScaleSync.prototype._startUpdate = function _startUpdate(event) {
        this._scaleFactor = 1;
        this._startDist = TwoFingerSync.calculateDistance(this.posA, this.posB);
        this._eventOutput.emit('start', {
            count: event.touches.length,
            touches: [this.touchAId, this.touchBId],
            distance: this._startDist,
            center: TwoFingerSync.calculateCenter(this.posA, this.posB)
        });
    };

    // handles movement of two fingers
    ScaleSync.prototype._moveUpdate = function _moveUpdate(diffTime) {
        var scale = this.options.scale;

        var currDist = TwoFingerSync.calculateDistance(this.posA, this.posB);
        var center = TwoFingerSync.calculateCenter(this.posA, this.posB);

        var delta = (currDist - this._startDist) / this._startDist;
        var newScaleFactor = Math.max(1 + scale * delta, 0);
        var veloScale = (newScaleFactor - this._scaleFactor) / diffTime;

        this._eventOutput.emit('update', {
            delta: delta,
            scale: newScaleFactor,
            velocity: veloScale,
            distance: currDist,
            center: center,
            touches: [this.touchAId, this.touchBId]
        });

        this._scaleFactor = newScaleFactor;
    };

    /**
     * Return entire options dictionary, including defaults.
     *
     * @method getOptions
     * @return {Object} configuration options
     */
    ScaleSync.prototype.getOptions = function getOptions() {
        return this.options;
    };

    /**
     * Set internal options, overriding any default options
     *
     * @method setOptions
     *
     * @param {Object} [options] overrides of default options
     * @param {Number} [options.scale] scale velocity by this factor
     */
    ScaleSync.prototype.setOptions = function setOptions(options) {
        if (options.scale !== undefined) this.options.scale = options.scale;
    };

    module.exports = ScaleSync;
});
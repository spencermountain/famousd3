/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/events/EventArbiter', ['require', 'exports', 'module', 'famous/core/EventHandler'], function(require, exports, module) {
    var EventHandler = require('famous/core/EventHandler');

    /**
     * A switch which wraps several event destinations and
     *  redirects received events to at most one of them.
     *  Setting the 'mode' of the object dictates which one
     *  of these destinations will receive events.
     *
     * @class EventArbiter
     * @constructor
     *
     * @param {Number | string} startMode initial setting of switch,
     */
    function EventArbiter(startMode) {
        this.dispatchers = {};
        this.currMode = undefined;
        this.setMode(startMode);
    }

    /**
     * Set switch to this mode, passing events to the corresponding
     *   EventHandler.  If mode has changed, emits 'change' event,
     *   emits 'unpipe' event to the old mode's handler, and emits 'pipe'
     *   event to the new mode's handler.
     *
     * @method setMode
     *
     * @param {string | number} mode indicating which event handler to send to.
     */
    EventArbiter.prototype.setMode = function setMode(mode) {
        if (mode !== this.currMode) {
            var startMode = this.currMode;

            if (this.dispatchers[this.currMode]) this.dispatchers[this.currMode].trigger('unpipe');
            this.currMode = mode;
            if (this.dispatchers[mode]) this.dispatchers[mode].emit('pipe');
            this.emit('change', {
                from: startMode,
                to: mode
            });
        }
    };

    /**
     * Return the existing EventHandler corresponding to this
     *   mode, creating one if it doesn't exist.
     *
     * @method forMode
     *
     * @param {string | number} mode mode to which this eventHandler corresponds
     *
     * @return {EventHandler} eventHandler corresponding to this mode
     */
    EventArbiter.prototype.forMode = function forMode(mode) {
        if (!this.dispatchers[mode]) this.dispatchers[mode] = new EventHandler();
        return this.dispatchers[mode];
    };

    /**
     * Trigger an event, sending to currently selected handler, if
     *   it is listening for provided 'type' key.
     *
     * @method emit
     *
     * @param {string} eventType event type key (for example, 'click')
     * @param {Object} event event data
     * @return {EventHandler} this
     */
    EventArbiter.prototype.emit = function emit(eventType, event) {
        if (this.currMode === undefined) return false;
        if (!event) event = {};
        var dispatcher = this.dispatchers[this.currMode];
        if (dispatcher) return dispatcher.trigger(eventType, event);
    };

    module.exports = EventArbiter;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/events/EventFilter', ['require', 'exports', 'module', 'famous/core/EventHandler'], function(require, exports, module) {
    var EventHandler = require('famous/core/EventHandler');

    /**
     * EventFilter regulates the broadcasting of events based on
     *  a specified condition function of standard event type: function(type, data).
     *
     * @class EventFilter
     * @constructor
     *
     * @param {function} condition function to determine whether or not
     *    events are emitted.
     */
    function EventFilter(condition) {
        EventHandler.call(this);
        this._condition = condition;
    }
    EventFilter.prototype = Object.create(EventHandler.prototype);
    EventFilter.prototype.constructor = EventFilter;

    /**
     * If filter condition is met, trigger an event, sending to all downstream handlers
     *   listening for provided 'type' key.
     *
     * @method emit
     *
     * @param {string} type event type key (for example, 'click')
     * @param {Object} data event data
     * @return {EventHandler} this
     */
    EventFilter.prototype.emit = function emit(type, data) {
        if (this._condition(type, data))
            return EventHandler.prototype.emit.apply(this, arguments);
    };

    /**
     * An alias of emit. Trigger determines whether to send
     *  events based on the return value of it's condition function
     *  when passed the event type and associated data.
     *
     * @method trigger
     * @param {string} type name of the event
     * @param {object} data associated data
     */
    EventFilter.prototype.trigger = EventFilter.prototype.emit;

    module.exports = EventFilter;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/events/EventMapper', ['require', 'exports', 'module', 'famous/core/EventHandler'], function(require, exports, module) {
    var EventHandler = require('famous/core/EventHandler');

    /**
     * EventMapper routes events to various event destinations
     *  based on custom logic.  The function signature is arbitrary.
     *
     * @class EventMapper
     * @constructor
     *
     * @param {function} mappingFunction function to determine where
     *  events are routed to.
     */
    function EventMapper(mappingFunction) {
        EventHandler.call(this);
        this._mappingFunction = mappingFunction;
    }
    EventMapper.prototype = Object.create(EventHandler.prototype);
    EventMapper.prototype.constructor = EventMapper;

    EventMapper.prototype.subscribe = null;
    EventMapper.prototype.unsubscribe = null;

    /**
     * Trigger an event, sending to all mapped downstream handlers
     *   listening for provided 'type' key.
     *
     * @method emit
     *
     * @param {string} type event type key (for example, 'click')
     * @param {Object} data event data
     * @return {EventHandler} this
     */
    EventMapper.prototype.emit = function emit(type, data) {
        var target = this._mappingFunction.apply(this, arguments);
        if (target && (target.emit instanceof Function)) target.emit(type, data);
    };

    /**
     * Alias of emit.
     * @method trigger
     */
    EventMapper.prototype.trigger = EventMapper.prototype.emit;

    module.exports = EventMapper;
});
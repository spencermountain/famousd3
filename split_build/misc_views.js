/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/transitions/CachedMap', ['require', 'exports', 'module'], function(require, exports, module) {
    /**
     * A simple in-memory object cache.  Used as a helper for Views with
     * provider functions.
     * @class CachedMap
     * @constructor
     */
    function CachedMap(mappingFunction) {
        this._map = mappingFunction || null;
        this._cachedOutput = null;
        this._cachedInput = Number.NaN; //never valid as input
    }

    /**
     * Creates a mapping function with a cache.
     * This is the main entrypoint for this object.
     * @static
     * @method create
     * @param {function} mappingFunction mapping
     * @return {function} memoized mapping function
     */
    CachedMap.create = function create(mappingFunction) {
        var instance = new CachedMap(mappingFunction);
        return instance.get.bind(instance);
    };

    /**
     * Retrieve items from cache or from mapping functin.
     *
     * @method get
     * @param {Object} input input key
     */
    CachedMap.prototype.get = function get(input) {
        if (input !== this._cachedInput) {
            this._cachedInput = input;
            this._cachedOutput = this._map(input);
        }
        return this._cachedOutput;
    };

    module.exports = CachedMap;
});


/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: felix@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/views/EdgeSwapper', ['require', 'exports', 'module', 'famous/transitions/CachedMap', 'famous/core/Entity', 'famous/core/EventHandler', 'famous/core/Transform', './RenderController'], function(require, exports, module) {
    var CachedMap = require('famous/transitions/CachedMap');
    var Entity = require('famous/core/Entity');
    var EventHandler = require('famous/core/EventHandler');
    var Transform = require('famous/core/Transform');
    var RenderController = require('./RenderController');

    /**
     * Container which handles swapping renderables from the edge of its parent context.
     * @class EdgeSwapper
     * @constructor
     * @param {Options} [options] An object of configurable options.
     *   Takes the same options as RenderController.
     * @uses RenderController
     */
    function EdgeSwapper(options) {
        this._currentTarget = null;
        this._size = [undefined, undefined];

        this._controller = new RenderController(options);
        this._controller.inTransformFrom(CachedMap.create(_transformMap.bind(this, 0.0001)));
        this._controller.outTransformFrom(CachedMap.create(_transformMap.bind(this, -0.0001)));

        this._eventInput = new EventHandler();
        EventHandler.setInputHandler(this, this._eventInput);

        this._entityId = Entity.register(this);
        if (options) this.setOptions(options);
    }

    function _transformMap(zMax, progress) {
        return Transform.translate(this._size[0] * (1 - progress), 0, zMax * (1 - progress));
    }

    /**
     * Displays the passed-in content with the EdgeSwapper instance's default transition.
     *
     * @method show
     * @param {Object} content The renderable you want to display.
     */
    EdgeSwapper.prototype.show = function show(content) {
        // stop sending input to old target
        if (this._currentTarget) this._eventInput.unpipe(this._currentTarget);

        this._currentTarget = content;

        // start sending input to new target
        if (this._currentTarget && this._currentTarget.trigger) this._eventInput.pipe(this._currentTarget);

        this._controller.show.apply(this._controller, arguments);
    };

    /**
     * Patches the EdgeSwapper instance's options with the passed-in ones.
     *
     * @method setOptions
     * @param {Options} options An object of configurable options for the Edgeswapper instance.
     */
    EdgeSwapper.prototype.setOptions = function setOptions(options) {
        this._controller.setOptions(options);
    };

    /**
     * Generate a render spec from the contents of this component.
     *
     * @private
     * @method render
     * @return {number} Render spec for this component
     */
    EdgeSwapper.prototype.render = function render() {
        return this._entityId;
    };

    /**
     * Apply changes from this component to the corresponding document element.
     * This includes changes to classes, styles, size, content, opacity, origin,
     * and matrix transforms.
     *
     * @private
     * @method commit
     * @param {Context} context commit context
     */
    EdgeSwapper.prototype.commit = function commit(context) {
        this._size[0] = context.size[0];
        this._size[1] = context.size[1];

        return {
            transform: context.transform,
            opacity: context.opacity,
            origin: context.origin,
            size: context.size,
            target: this._controller.render()
        };
    };

    module.exports = EdgeSwapper;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mike@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/views/FlexibleLayout', ['require', 'exports', 'module', 'famous/core/Entity', 'famous/core/Transform', 'famous/core/OptionsManager', 'famous/core/EventHandler', 'famous/transitions/Transitionable'], function(require, exports, module) {
    var Entity = require('famous/core/Entity');
    var Transform = require('famous/core/Transform');
    var OptionsManager = require('famous/core/OptionsManager');
    var EventHandler = require('famous/core/EventHandler');
    var Transitionable = require('famous/transitions/Transitionable');

    /**
     * A layout which divides a context into sections based on a proportion
     *   of the total sum of ratios.  FlexibleLayout can either lay renderables
     *   out vertically or horizontally.
     * @class FlexibleLayout
     * @constructor
     * @param {Options} [options] An object of configurable options.
     * @param {Number} [options.direction=0] Direction the FlexibleLayout instance should lay out renderables.
     * @param {Transition} [options.transition=false] The transiton that controls the FlexibleLayout instance's reflow.
     * @param {Ratios} [options.ratios=[]] The proportions for the renderables to maintain
     */
    function FlexibleLayout(options) {
        this.options = Object.create(FlexibleLayout.DEFAULT_OPTIONS);
        this.optionsManager = new OptionsManager(this.options);
        if (options) this.setOptions(options);

        this.id = Entity.register(this);

        this._ratios = new Transitionable(this.options.ratios);
        this._nodes = [];

        this._cachedDirection = null;
        this._cachedTotalLength = false;
        this._cachedLengths = [];
        this._cachedTransforms = null;
        this._ratiosDirty = false;

        this._eventOutput = new EventHandler();
        EventHandler.setOutputHandler(this, this._eventOutput);
    }

    FlexibleLayout.DIRECTION_X = 0;
    FlexibleLayout.DIRECTION_Y = 1;

    FlexibleLayout.DEFAULT_OPTIONS = {
        direction: FlexibleLayout.DIRECTION_X,
        transition: false,
        ratios: []
    };

    function _reflow(ratios, length, direction) {
        var currTransform;
        var translation = 0;
        var flexLength = length;
        var ratioSum = 0;
        var ratio;
        var node;
        var i;

        this._cachedLengths = [];
        this._cachedTransforms = [];

        for (i = 0; i < ratios.length; i++) {
            ratio = ratios[i];
            node = this._nodes[i];

            if (typeof ratio !== 'number')
                flexLength -= node.getSize()[direction] || 0;
            else
                ratioSum += ratio;
        }

        for (i = 0; i < ratios.length; i++) {
            node = this._nodes[i];
            ratio = ratios[i];

            length = (typeof ratio === 'number') ? flexLength * ratio / ratioSum : node.getSize()[direction];

            currTransform = (direction === FlexibleLayout.DIRECTION_X) ? Transform.translate(translation, 0, 0) : Transform.translate(0, translation, 0);

            this._cachedTransforms.push(currTransform);
            this._cachedLengths.push(length);

            translation += length;
        }
    }

    /**
     * Generate a render spec from the contents of this component.
     *
     * @private
     * @method render
     * @return {Object} Render spec for this component
     */
    FlexibleLayout.prototype.render = function render() {
        return this.id;
    };

    /**
     * Patches the FlexibleLayouts instance's options with the passed-in ones.
     *
     * @method setOptions
     * @param {Options} options An object of configurable options for the FlexibleLayout instance.
     */
    FlexibleLayout.prototype.setOptions = function setOptions(options) {
        this.optionsManager.setOptions(options);
    };

    /**
     * Sets the collection of renderables under the FlexibleLayout instance's control.  Also sets
     * the associated ratio values for sizing the renderables if given.
     *
     * @method sequenceFrom
     * @param {Array} sequence An array of renderables.
     */
    FlexibleLayout.prototype.sequenceFrom = function sequenceFrom(sequence) {
        this._nodes = sequence;

        if (this._ratios.get().length === 0) {
            var ratios = [];
            for (var i = 0; i < this._nodes.length; i++) ratios.push(1);
            this.setRatios(ratios);
        }
    };

    /**
     * Sets the associated ratio values for sizing the renderables.
     *
     * @method setRatios
     * @param {Array} ratios Array of ratios corresponding to the percentage sizes each renderable should be
     */
    FlexibleLayout.prototype.setRatios = function setRatios(ratios, transition, callback) {
        if (transition === undefined) transition = this.options.transition;
        var currRatios = this._ratios;
        if (currRatios.get().length === 0) transition = undefined;
        if (currRatios.isActive()) currRatios.halt();
        currRatios.set(ratios, transition, callback);
        this._ratiosDirty = true;
    };

    /**
     * Apply changes from this component to the corresponding document element.
     * This includes changes to classes, styles, size, content, opacity, origin,
     * and matrix transforms.
     *
     * @private
     * @method commit
     * @param {Context} context commit context
     */
    FlexibleLayout.prototype.commit = function commit(context) {
        var parentSize = context.size;
        var parentTransform = context.transform;
        var parentOrigin = context.origin;

        var ratios = this._ratios.get();
        var direction = this.options.direction;
        var length = parentSize[direction];
        var size;

        if (length !== this._cachedTotalLength || this._ratiosDirty || this._ratios.isActive() || direction !== this._cachedDirection) {
            _reflow.call(this, ratios, length, direction);

            if (length !== this._cachedTotalLength) this._cachedTotalLength = length;
            if (direction !== this._cachedDirection) this._cachedDirection = direction;
            if (this._ratiosDirty) this._ratiosDirty = false;
        }

        var result = [];
        for (var i = 0; i < ratios.length; i++) {
            size = [undefined, undefined];
            length = this._cachedLengths[i];
            size[direction] = length;
            result.push({
                transform: this._cachedTransforms[i],
                size: size,
                target: this._nodes[i].render()
            });
        }

        if (parentSize && (parentOrigin[0] !== 0 && parentOrigin[1] !== 0))
            parentTransform = Transform.moveThen([-parentSize[0] * parentOrigin[0], -parentSize[1] * parentOrigin[1], 0], parentTransform);

        return {
            transform: parentTransform,
            size: parentSize,
            target: result
        };
    };

    module.exports = FlexibleLayout;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: felix@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/views/Flipper', ['require', 'exports', 'module', 'famous/core/Transform', 'famous/transitions/Transitionable', 'famous/core/RenderNode', 'famous/core/OptionsManager'], function(require, exports, module) {
    var Transform = require('famous/core/Transform');
    var Transitionable = require('famous/transitions/Transitionable');
    var RenderNode = require('famous/core/RenderNode');
    var OptionsManager = require('famous/core/OptionsManager');

    /**
     * Allows you to link two renderables as front and back sides that can be
     *  'flipped' back and forth along a chosen axis. Rendering optimizations are
     *  automatically handled.
     *
     * @class Flipper
     * @constructor
     * @param {Options} [options] An object of options.
     * @param {Transition} [options.transition=true] The transition executed when flipping your Flipper instance.
     */
    function Flipper(options) {
        this.options = Object.create(Flipper.DEFAULT_OPTIONS);
        this._optionsManager = new OptionsManager(this.options);
        if (options) this.setOptions(options);

        this.angle = new Transitionable(0);

        this.frontNode = undefined;
        this.backNode = undefined;

        this.flipped = false;
    }

    Flipper.DIRECTION_X = 0;
    Flipper.DIRECTION_Y = 1;

    var SEPERATION_LENGTH = 1;

    Flipper.DEFAULT_OPTIONS = {
        transition: true,
        direction: Flipper.DIRECTION_X
    };

    /**
     * Toggles the rotation between the front and back renderables
     *
     * @method flip
     * @param {Object} [transition] Transition definition
     * @param {Function} [callback] Callback
     */
    Flipper.prototype.flip = function flip(transition, callback) {
        var angle = this.flipped ? 0 : Math.PI;
        this.setAngle(angle, transition, callback);
        this.flipped = !this.flipped;
    };

    /**
     * Basic setter to the angle
     *
     * @method setAngle
     * @param {Number} angle
     * @param {Object} [transition] Transition definition
     * @param {Function} [callback] Callback
     */
    Flipper.prototype.setAngle = function setAngle(angle, transition, callback) {
        if (transition === undefined) transition = this.options.transition;
        if (this.angle.isActive()) this.angle.halt();
        this.angle.set(angle, transition, callback);
    };

    /**
     * Patches the Flipper instance's options with the passed-in ones.
     *
     * @method setOptions
     * @param {Options} options An object of configurable options for the Flipper instance.
     */
    Flipper.prototype.setOptions = function setOptions(options) {
        return this._optionsManager.setOptions(options);
    };

    /**
     * Adds the passed-in renderable to the view associated with the 'front' of the Flipper instance.
     *
     * @method setFront
     * @chainable
     * @param {Object} node The renderable you want to add to the front.
     */
    Flipper.prototype.setFront = function setFront(node) {
        this.frontNode = node;
    };

    /**
     * Adds the passed-in renderable to the view associated with the 'back' of the Flipper instance.
     *
     * @method setBack
     * @chainable
     * @param {Object} node The renderable you want to add to the back.
     */
    Flipper.prototype.setBack = function setBack(node) {
        this.backNode = node;
    };

    /**
     * Generate a render spec from the contents of this component.
     *
     * @private
     * @method render
     * @return {Number} Render spec for this component
     */
    Flipper.prototype.render = function render() {
        var angle = this.angle.get();

        var frontTransform;
        var backTransform;

        if (this.options.direction === Flipper.DIRECTION_X) {
            frontTransform = Transform.rotateY(angle);
            backTransform = Transform.rotateY(angle + Math.PI);
        } else {
            frontTransform = Transform.rotateX(angle);
            backTransform = Transform.rotateX(angle + Math.PI);
        }

        var result = [];
        if (this.frontNode) {
            result.push({
                transform: frontTransform,
                target: this.frontNode.render()
            });
        }

        if (this.backNode) {
            result.push({
                transform: Transform.moveThen([0, 0, SEPERATION_LENGTH], backTransform),
                target: this.backNode.render()
            });
        }

        return result;
    };

    module.exports = Flipper;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: felix@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/views/HeaderFooterLayout', ['require', 'exports', 'module', 'famous/core/Entity', 'famous/core/RenderNode', 'famous/core/Transform', 'famous/core/OptionsManager'], function(require, exports, module) {
    var Entity = require('famous/core/Entity');
    var RenderNode = require('famous/core/RenderNode');
    var Transform = require('famous/core/Transform');
    var OptionsManager = require('famous/core/OptionsManager');

    /**
     * A layout which will arrange three renderables into a header and footer area of defined size,
      and a content area of flexible size.
     * @class HeaderFooterLayout
     * @constructor
     * @param {Options} [options] An object of configurable options.
     * @param {Number} [options.direction=HeaderFooterLayout.DIRECTION_Y] A direction of HeaderFooterLayout.DIRECTION_X
     * lays your HeaderFooterLayout instance horizontally, and a direction of HeaderFooterLayout.DIRECTION_Y
     * lays it out vertically.
     * @param {Number} [options.headerSize=undefined]  The amount of pixels allocated to the header node
     * in the HeaderFooterLayout instance's direction.
     * @param {Number} [options.footerSize=undefined] The amount of pixels allocated to the footer node
     * in the HeaderFooterLayout instance's direction.
     */
    function HeaderFooterLayout(options) {
        this.options = Object.create(HeaderFooterLayout.DEFAULT_OPTIONS);
        this._optionsManager = new OptionsManager(this.options);
        if (options) this.setOptions(options);

        this._entityId = Entity.register(this);

        this.header = new RenderNode();
        this.footer = new RenderNode();
        this.content = new RenderNode();
    }

    /**
     *  When used as a value for your HeaderFooterLayout's direction option, causes it to lay out horizontally.
     *
     *  @attribute DIRECTION_X
     *  @type Number
     *  @static
     *  @default 0
     *  @protected
     */
    HeaderFooterLayout.DIRECTION_X = 0;

    /**
     *  When used as a value for your HeaderFooterLayout's direction option, causes it to lay out vertically.
     *
     *  @attribute DIRECTION_Y
     *  @type Number
     *  @static
     *  @default 1
     *  @protected
     */
    HeaderFooterLayout.DIRECTION_Y = 1;

    HeaderFooterLayout.DEFAULT_OPTIONS = {
        direction: HeaderFooterLayout.DIRECTION_Y,
        headerSize: undefined,
        footerSize: undefined,
        defaultHeaderSize: 0,
        defaultFooterSize: 0
    };

    /**
     * Generate a render spec from the contents of this component.
     *
     * @private
     * @method render
     * @return {Object} Render spec for this component
     */
    HeaderFooterLayout.prototype.render = function render() {
        return this._entityId;
    };

    /**
     * Patches the HeaderFooterLayout instance's options with the passed-in ones.
     *
     * @method setOptions
     * @param {Options} options An object of configurable options for the HeaderFooterLayout instance.
     */
    HeaderFooterLayout.prototype.setOptions = function setOptions(options) {
        return this._optionsManager.setOptions(options);
    };

    function _resolveNodeSize(node, defaultSize) {
        var nodeSize = node.getSize();
        return nodeSize ? nodeSize[this.options.direction] : defaultSize;
    }

    function _outputTransform(offset) {
        if (this.options.direction === HeaderFooterLayout.DIRECTION_X) return Transform.translate(offset, 0, 0);
        else return Transform.translate(0, offset, 0);
    }

    function _finalSize(directionSize, size) {
        if (this.options.direction === HeaderFooterLayout.DIRECTION_X) return [directionSize, size[1]];
        else return [size[0], directionSize];
    }

    /**
     * Apply changes from this component to the corresponding document element.
     * This includes changes to classes, styles, size, content, opacity, origin,
     * and matrix transforms.
     *
     * @private
     * @method commit
     * @param {Context} context commit context
     */
    HeaderFooterLayout.prototype.commit = function commit(context) {
        var transform = context.transform;
        var origin = context.origin;
        var size = context.size;
        var opacity = context.opacity;

        var headerSize = (this.options.headerSize !== undefined) ? this.options.headerSize : _resolveNodeSize.call(this, this.header, this.options.defaultHeaderSize);
        var footerSize = (this.options.footerSize !== undefined) ? this.options.footerSize : _resolveNodeSize.call(this, this.footer, this.options.defaultFooterSize);
        var contentSize = size[this.options.direction] - headerSize - footerSize;

        if (size) transform = Transform.moveThen([-size[0] * origin[0], -size[1] * origin[1], 0], transform);

        var result = [{
            size: _finalSize.call(this, headerSize, size),
            target: this.header.render()
        }, {
            transform: _outputTransform.call(this, headerSize),
            size: _finalSize.call(this, contentSize, size),
            target: this.content.render()
        }, {
            transform: _outputTransform.call(this, headerSize + contentSize),
            size: _finalSize.call(this, footerSize, size),
            target: this.footer.render()
        }];

        return {
            transform: transform,
            opacity: opacity,
            size: size,
            target: result
        };
    };

    module.exports = HeaderFooterLayout;
});



define('famous/views/Lightbox', ['require', 'exports', 'module', 'famous/core/Transform', 'famous/core/Modifier', 'famous/core/RenderNode', 'famous/utilities/Utility', 'famous/core/OptionsManager', 'famous/transitions/Transitionable', 'famous/transitions/TransitionableTransform'], function(require, exports, module) {
    var Transform = require('famous/core/Transform');
    var Modifier = require('famous/core/Modifier');
    var RenderNode = require('famous/core/RenderNode');
    var Utility = require('famous/utilities/Utility');
    var OptionsManager = require('famous/core/OptionsManager');
    var Transitionable = require('famous/transitions/Transitionable');
    var TransitionableTransform = require('famous/transitions/TransitionableTransform');

    /**
     * Lightbox, using transitions, shows and hides different renderables. Lightbox can essentially be
     * thought of as RenderController with a stateful implementation and interface.
     *
     * @class Lightbox
     * @constructor
     * @param {Options} [options] An object of configurable options.
     * @param {Transform} [options.inTransform] The transform at the start of transitioning in a shown renderable.
     * @param {Transform} [options.outTransform] The transform at the end of transitioning out a renderable.
     * @param {Transform} [options.showTransform] The transform applied to your shown renderable in its state of equilibrium.
     * @param {Number} [options.inOpacity] A number between one and zero that defines the state of a shown renderables opacity upon initially
     * being transitioned in.
     * @param {Number} [options.outOpacity] A number between one and zero that defines the state of a shown renderables opacity upon being
     * fully transitioned out.
     * @param {Number} [options.showOpacity] A number between one and zero that defines the state of a shown renderables opacity
     * once succesfully transitioned in.
     * @param {Array<Number>} [options.inOrigin] A two value array of numbers between one and zero that defines the state of a shown renderables
     * origin upon intially being transitioned in.
     * @param {Array<Number>} [options.outOrigin] A two value array of numbers between one and zero that defines the state of a shown renderable
     * once fully hidden.
     * @param {Array<Number>} [options.showOrigin] A two value array of numbers between one and zero that defines the state of a shown renderables
     * origin upon succesfully being shown.
     * @param {Transition} [options.inTransition=true] The transition in charge of showing a renderable.
     * @param {Transition} [options.outTransition=true]  The transition in charge of removing your previous renderable when
     * you show a new one, or hiding your current renderable.
     * @param {Boolean} [options.overlap=false] When showing a new renderable, overlap determines if the
     *   out transition of the old one executes concurrently with the in transition of the new one,
     *  or synchronously beforehand.
     */
    function Lightbox(options) {
        this.options = Object.create(Lightbox.DEFAULT_OPTIONS);
        this._optionsManager = new OptionsManager(this.options);

        if (options) this.setOptions(options);

        this._showing = false;
        this.nodes = [];
        this.transforms = [];
        this.states = [];
    }

    Lightbox.DEFAULT_OPTIONS = {
        inTransform: Transform.scale(0.001, 0.001, 0.001),
        inOpacity: 0,
        inOrigin: [0.5, 0.5],
        outTransform: Transform.scale(0.001, 0.001, 0.001),
        outOpacity: 0,
        outOrigin: [0.5, 0.5],
        showTransform: Transform.identity,
        showOpacity: 1,
        showOrigin: [0.5, 0.5],
        inTransition: true,
        outTransition: true,
        overlap: false
    };

    /**
     * Patches the Lightbox instance's options with the passed-in ones.
     *
     * @method setOptions
     * @param {Options} options An object of configurable options for the Lightbox instance.
     */
    Lightbox.prototype.setOptions = function setOptions(options) {
        return this._optionsManager.setOptions(options);
    };

    /**
     * Show displays the targeted renderable with a transition and an optional callback to
     *  execute afterwards.
     * @method show
     * @param {Object} renderable The renderable you want to show.
     * @param {Transition} [transition] Overwrites the default transition in to display the
     * passed-in renderable.
     * @param {function} [callback] Executes after transitioning in the renderable.
     */
    Lightbox.prototype.show = function show(renderable, transition, callback) {
        if (!renderable) {
            return this.hide(callback);
        }

        if (transition instanceof Function) {
            callback = transition;
            transition = undefined;
        }

        if (this._showing) {
            if (this.options.overlap) this.hide();
            else {
                return this.hide(this.show.bind(this, renderable, transition, callback));
            }
        }
        this._showing = true;

        var stateItem = {
            transform: new TransitionableTransform(this.options.inTransform),
            origin: new Transitionable(this.options.inOrigin),
            opacity: new Transitionable(this.options.inOpacity)
        };

        var transform = new Modifier({
            transform: stateItem.transform,
            opacity: stateItem.opacity,
            origin: stateItem.origin
        });
        var node = new RenderNode();
        node.add(transform).add(renderable);
        this.nodes.push(node);
        this.states.push(stateItem);
        this.transforms.push(transform);

        var _cb = callback ? Utility.after(3, callback) : undefined;

        if (!transition) transition = this.options.inTransition;
        stateItem.transform.set(this.options.showTransform, transition, _cb);
        stateItem.opacity.set(this.options.showOpacity, transition, _cb);
        stateItem.origin.set(this.options.showOrigin, transition, _cb);
    };

    /**
     * Hide hides the currently displayed renderable with an out transition.
     * @method hide
     * @param {Transition} [transition] Overwrites the default transition in to hide the
     * currently controlled renderable.
     * @param {function} [callback] Executes after transitioning out the renderable.
     */
    Lightbox.prototype.hide = function hide(transition, callback) {
        if (!this._showing) return;
        this._showing = false;

        if (transition instanceof Function) {
            callback = transition;
            transition = undefined;
        }

        var node = this.nodes[this.nodes.length - 1];
        var transform = this.transforms[this.transforms.length - 1];
        var stateItem = this.states[this.states.length - 1];
        var _cb = Utility.after(3, function() {
            this.nodes.splice(this.nodes.indexOf(node), 1);
            this.states.splice(this.states.indexOf(stateItem), 1);
            this.transforms.splice(this.transforms.indexOf(transform), 1);
            if (callback) callback.call(this);
        }.bind(this));

        if (!transition) transition = this.options.outTransition;
        stateItem.transform.set(this.options.outTransform, transition, _cb);
        stateItem.opacity.set(this.options.outOpacity, transition, _cb);
        stateItem.origin.set(this.options.outOrigin, transition, _cb);
    };

    /**
     * Generate a render spec from the contents of this component.
     *
     * @private
     * @method render
     * @return {number} Render spec for this component
     */
    Lightbox.prototype.render = function render() {
        var result = [];
        for (var i = 0; i < this.nodes.length; i++) {
            result.push(this.nodes[i].render());
        }
        return result;
    };

    module.exports = Lightbox;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: felix@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/views/Deck', ['require', 'exports', 'module', 'famous/core/Transform', 'famous/core/OptionsManager', 'famous/transitions/Transitionable', 'famous/utilities/Utility', './SequentialLayout'], function(require, exports, module) {
    var Transform = require('famous/core/Transform');
    var OptionsManager = require('famous/core/OptionsManager');
    var Transitionable = require('famous/transitions/Transitionable');
    var Utility = require('famous/utilities/Utility');
    var SequentialLayout = require('./SequentialLayout');

    /**
     * A Sequential Layout that can be opened and closed with animations.
     *
     *   Takes the same options as SequentialLayout
     *   as well as options for the open/close transition
     *   and the rotation you want your Deck instance to layout in.
     *
     * @class Deck
     * @constructor
     * @extends SequentialLayout
     *
     * @param {Options} [options] An object of configurable options
     * @param {Transition} [options.transition={duration: 500, curve: 'easeOutBounce'}
     *   The transition that executes upon opening or closing your deck instance.
     * @param {Number} [stackRotation=0] The amount of rotation applied to the propogation
     *   of the Deck instance's stack of renderables.
     * @param {Object} [options.transition] A transition object for changing between states.
     * @param {Number} [options.direction] axis of expansion (Utility.Direction.X or .Y)
     */
    function Deck(options) {
        SequentialLayout.apply(this, arguments);
        this.state = new Transitionable(0);
        this._isOpen = false;

        this.setOutputFunction(function(input, offset, index) {
            var state = _getState.call(this);
            var positionMatrix = (this.options.direction === Utility.Direction.X) ?
                Transform.translate(state * offset, 0, 0.001 * (state - 1) * offset) :
                Transform.translate(0, state * offset, 0.001 * (state - 1) * offset);
            var output = input.render();
            if (this.options.stackRotation) {
                var amount = this.options.stackRotation * index * (1 - state);
                output = {
                    transform: Transform.rotateZ(amount),
                    origin: [0.5, 0.5],
                    target: output
                };
            }
            return {
                transform: positionMatrix,
                size: input.getSize(),
                target: output
            };
        });
    }
    Deck.prototype = Object.create(SequentialLayout.prototype);
    Deck.prototype.constructor = Deck;

    Deck.DEFAULT_OPTIONS = OptionsManager.patch(SequentialLayout.DEFAULT_OPTIONS, {
        transition: {
            curve: 'easeOutBounce',
            duration: 500
        },
        stackRotation: 0
    });

    /**
     * Returns the width and the height of the Deck instance.
     *
     * @method getSize
     * @return {Array} A two value array of Deck's current width and height (in that order).
     *   Scales as Deck opens and closes.
     */
    Deck.prototype.getSize = function getSize() {
        var originalSize = SequentialLayout.prototype.getSize.apply(this, arguments);
        var firstSize = this._items ? this._items.get().getSize() : [0, 0];
        if (!firstSize) firstSize = [0, 0];
        var state = _getState.call(this);
        var invState = 1 - state;
        return [firstSize[0] * invState + originalSize[0] * state, firstSize[1] * invState + originalSize[1] * state];
    };

    function _getState(returnFinal) {
        if (returnFinal) return this._isOpen ? 1 : 0;
        else return this.state.get();
    }

    function _setState(pos, transition, callback) {
        this.state.halt();
        this.state.set(pos, transition, callback);
    }

    /**
     * An accesor method to find out if the messaged Deck instance is open or closed.
     *
     * @method isOpen
     * @return {Boolean} Returns true if the instance is open or false if it's closed.
     */
    Deck.prototype.isOpen = function isOpen() {
        return this._isOpen;
    };

    /**
     * Sets the Deck instance to an open state.
     *
     * @method open
     * @param {function} [callback] Executes after transitioning to a fully open state.
     */
    Deck.prototype.open = function open(callback) {
        this._isOpen = true;
        _setState.call(this, 1, this.options.transition, callback);
    };

    /**
     * Sets the Deck instance to an open state.
     *
     * @method close
     * @param {function} [callback] Executes after transitioning to a fully closed state.
     */
    Deck.prototype.close = function close(callback) {
        this._isOpen = false;
        _setState.call(this, 0, this.options.transition, callback);
    };

    /**
     * Sets the Deck instance from its current state to the opposite state.
     *
     * @method close
     * @param {function} [callback] Executes after transitioning to the toggled state.
     */
    Deck.prototype.toggle = function toggle(callback) {
        if (this._isOpen) this.close(callback);
        else this.open(callback);
    };

    module.exports = Deck;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mike@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/views/ContextualView', ['require', 'exports', 'module', 'famous/core/Entity', 'famous/core/Transform', 'famous/core/EventHandler', 'famous/core/OptionsManager'], function(require, exports, module) {
    var Entity = require('famous/core/Entity');
    var Transform = require('famous/core/Transform');
    var EventHandler = require('famous/core/EventHandler');
    var OptionsManager = require('famous/core/OptionsManager');

    /**
     * ContextualView is an interface for creating views that need to
     *   be aware of their parent's transform, size, and/or origin.
     *   Consists of a OptionsManager paired with an input EventHandler
     *   and an output EventHandler. Meant to be extended by the developer.
     * @class ContextualView
     * @constructor
     * @param {Options} [options] An object of configurable options.
     */
    function ContextualView(options) {
        this.options = Object.create(this.constructor.DEFAULT_OPTIONS || ContextualView.DEFAULT_OPTIONS);
        this._optionsManager = new OptionsManager(this.options);
        if (options) this.setOptions(options);

        this._eventInput = new EventHandler();
        this._eventOutput = new EventHandler();
        EventHandler.setInputHandler(this, this._eventInput);
        EventHandler.setOutputHandler(this, this._eventOutput);

        this._id = Entity.register(this);
    }

    ContextualView.DEFAULT_OPTIONS = {};

    /**
     * Patches the ContextualLayout instance's options with the passed-in ones.
     *
     * @method setOptions
     * @param {Options} options An object of configurable options for the ContextualLayout instance.
     */
    ContextualView.prototype.setOptions = function setOptions(options) {
        return this._optionsManager.setOptions(options);
    };

    /**
     * Returns ContextualLayout instance's options.
     *
     * @method setOptions
     * @return {Options} options The instance's object of configurable options.
     */
    ContextualView.prototype.getOptions = function getOptions() {
        return this._optionsManager.getOptions();
    };

    /**
     * Return the registers Entity id for the ContextualView.
     *
     * @private
     * @method render
     * @return {Number} Registered Entity id
     */
    ContextualView.prototype.render = function render() {
        return this._id;
    };

    /**
     * Apply changes from this component to the corresponding document element.
     * This includes changes to classes, styles, size, content, opacity, origin,
     * and matrix transforms.
     *
     * @private
     * @method commit
     * @param {Context} context commit context
     */
    ContextualView.prototype.commit = function commit(context) {};

    module.exports = ContextualView;
});
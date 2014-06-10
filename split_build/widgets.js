/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/widgets/NavigationBar', ['require', 'exports', 'module', 'famous/core/Scene', 'famous/core/Surface', 'famous/core/Transform', 'famous/core/View'], function(require, exports, module) {
    var Scene = require('famous/core/Scene');
    var Surface = require('famous/core/Surface');
    var Transform = require('famous/core/Transform');
    var View = require('famous/core/View');

    /**
     * A view for displaying the title of the current page
     *  as well as icons for navigating backwards and opening
     *  further options
     *
     * @class NavigationBar
     * @extends View
     * @constructor
     *
     * @param {object} [options] overrides of default options
     * @param {Array.number} [options.size=(undefined,0.5)] Size of the navigation bar and it's componenets.
     * @param {Array.string} [options.backClasses=(back)] CSS Classes attached to back of Navigation.
     * @param {String} [options.backContent=(&#x25c0;)] Content of the back button.
     * @param {Array.string} [options.classes=(navigation)] CSS Classes attached to the surfaces.
     * @param {String} [options.content] Content to pass into title bar.
     * @param {Array.string} [options.classes=(more)] CSS Classes attached to the More surface.
     * @param {String} [options.moreContent=(&#x271a;)] Content of the more button.
     */
    function NavigationBar(options) {
        View.apply(this, arguments);

        this.title = new Surface({
            classes: this.options.classes,
            content: this.options.content
        });

        this.back = new Surface({
            size: [this.options.size[1], this.options.size[1]],
            classes: this.options.classes,
            content: this.options.backContent
        });
        this.back.on('click', function() {
            this._eventOutput.emit('back', {});
        }.bind(this));

        this.more = new Surface({
            size: [this.options.size[1], this.options.size[1]],
            classes: this.options.classes,
            content: this.options.moreContent
        });
        this.more.on('click', function() {
            this._eventOutput.emit('more', {});
        }.bind(this));

        this.layout = new Scene({
            id: 'master',
            size: this.options.size,
            target: [{
                transform: Transform.inFront,
                origin: [0, 0.5],
                target: this.back
            }, {
                origin: [0.5, 0.5],
                target: this.title
            }, {
                transform: Transform.inFront,
                origin: [1, 0.5],
                target: this.more
            }]
        });

        this._add(this.layout);

        this._optionsManager.on('change', function(event) {
            var key = event.id;
            var data = event.value;
            if (key === 'size') {
                this.layout.id.master.setSize(data);
                this.title.setSize(data);
                this.back.setSize([data[1], data[1]]);
                this.more.setSize([data[1], data[1]]);
            } else if (key === 'backClasses') {
                this.back.setOptions({
                    classes: this.options.classes.concat(this.options.backClasses)
                });
            } else if (key === 'backContent') {
                this.back.setContent(this.options.backContent);
            } else if (key === 'classes') {
                this.title.setOptions({
                    classes: this.options.classes
                });
                this.back.setOptions({
                    classes: this.options.classes.concat(this.options.backClasses)
                });
                this.more.setOptions({
                    classes: this.options.classes.concat(this.options.moreClasses)
                });
            } else if (key === 'content') {
                this.setContent(this.options.content);
            } else if (key === 'moreClasses') {
                this.more.setOptions({
                    classes: this.options.classes.concat(this.options.moreClasses)
                });
            } else if (key === 'moreContent') {
                this.more.setContent(this.options.content);
            }
        }.bind(this));
    }

    NavigationBar.prototype = Object.create(View.prototype);
    NavigationBar.prototype.constructor = NavigationBar;

    NavigationBar.DEFAULT_OPTIONS = {
        size: [undefined, 50],
        backClasses: ['back'],
        backContent: '&#x25c0;',
        classes: ['navigation'],
        content: '',
        moreClasses: ['more'],
        moreContent: '&#x271a;'
    };

    /**
     * Set the title of the NavigationBar
     *
     * @method setContent
     *
     * @param {object} content JSON object containing title information
     *
     * @return {undefined}
     */
    NavigationBar.prototype.setContent = function setContent(content) {
        return this.title.setContent(content);
    };

    module.exports = NavigationBar;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/widgets/Slider', ['require', 'exports', 'module', 'famous/core/Surface', 'famous/surfaces/CanvasSurface', 'famous/core/Transform', 'famous/core/EventHandler', 'famous/math/Utilities', 'famous/core/OptionsManager', 'famous/inputs/MouseSync', 'famous/inputs/TouchSync', 'famous/inputs/GenericSync'], function(require, exports, module) {
    var Surface = require('famous/core/Surface');
    var CanvasSurface = require('famous/surfaces/CanvasSurface');
    var Transform = require('famous/core/Transform');
    var EventHandler = require('famous/core/EventHandler');
    var Utilities = require('famous/math/Utilities');
    var OptionsManager = require('famous/core/OptionsManager');

    var MouseSync = require('famous/inputs/MouseSync');
    var TouchSync = require('famous/inputs/TouchSync');
    var GenericSync = require('famous/inputs/GenericSync');

    GenericSync.register({
        mouse: MouseSync,
        touch: TouchSync
    });

    /** @constructor */
    function Slider(options) {
        this.options = Object.create(Slider.DEFAULT_OPTIONS);
        this.optionsManager = new OptionsManager(this.options);
        if (options) this.setOptions(options);

        this.indicator = new CanvasSurface({
            size: this.options.indicatorSize,
            classes: ['slider-back']
        });

        this.label = new Surface({
            size: this.options.labelSize,
            content: this.options.label,
            properties: {
                pointerEvents: 'none'
            },
            classes: ['slider-label']
        });

        this.eventOutput = new EventHandler();
        this.eventInput = new EventHandler();
        EventHandler.setInputHandler(this, this.eventInput);
        EventHandler.setOutputHandler(this, this.eventOutput);

        var scale = (this.options.range[1] - this.options.range[0]) / this.options.indicatorSize[0];

        this.sync = new GenericSync(
            ['mouse', 'touch'], {
                scale: scale,
                direction: GenericSync.DIRECTION_X
            }
        );

        this.indicator.pipe(this.sync);
        this.sync.pipe(this);

        this.eventInput.on('update', function(data) {
            this.set(data.position);
        }.bind(this));

        this._drawPos = 0;
        _updateLabel.call(this);
    }

    Slider.DEFAULT_OPTIONS = {
        size: [200, 60],
        indicatorSize: [200, 30],
        labelSize: [200, 30],
        range: [0, 1],
        precision: 2,
        value: 0,
        label: '',
        fillColor: 'rgba(170, 170, 170, 1)'
    };

    function _updateLabel() {
        this.label.setContent(this.options.label + '<span style="float: right">' + this.get().toFixed(this.options.precision) + '</span>');
    }

    Slider.prototype.setOptions = function setOptions(options) {
        return this.optionsManager.setOptions(options);
    };

    Slider.prototype.get = function get() {
        return this.options.value;
    };

    Slider.prototype.set = function set(value) {
        if (value === this.options.value) return;
        this.options.value = Utilities.clamp(value, this.options.range);
        _updateLabel.call(this);
        this.eventOutput.emit('change', {
            value: value
        });
    };

    Slider.prototype.getSize = function getSize() {
        return this.options.size;
    };

    Slider.prototype.render = function render() {
        var range = this.options.range;
        var fillSize = Math.floor(((this.get() - range[0]) / (range[1] - range[0])) * this.options.indicatorSize[0]);

        if (fillSize < this._drawPos) {
            this.indicator.getContext('2d').clearRect(fillSize, 0, this._drawPos - fillSize + 1, this.options.indicatorSize[1]);
        } else if (fillSize > this._drawPos) {
            var ctx = this.indicator.getContext('2d');
            ctx.fillStyle = this.options.fillColor;
            ctx.fillRect(this._drawPos - 1, 0, fillSize - this._drawPos + 1, this.options.indicatorSize[1]);
        }
        this._drawPos = fillSize;

        return {
            size: this.options.size,
            target: [{
                origin: [0, 0],
                target: this.indicator.render()
            }, {
                transform: Transform.translate(0, 0, 1),
                origin: [0, 0],
                target: this.label.render()
            }]
        };
    };

    module.exports = Slider;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/widgets/ToggleButton', ['require', 'exports', 'module', 'famous/core/Surface', 'famous/core/EventHandler', 'famous/views/RenderController'], function(require, exports, module) {
    var Surface = require('famous/core/Surface');
    var EventHandler = require('famous/core/EventHandler');
    var RenderController = require('famous/views/RenderController');

    /**
     * A view for transitioning between two surfaces based
     *  on a 'on' and 'off' state
     *
     * @class TabBar
     * @extends View
     * @constructor
     *
     * @param {object} options overrides of default options
     */
    function ToggleButton(options) {
        this.options = {
            content: '',
            offClasses: ['off'],
            onClasses: ['on'],
            size: undefined,
            outTransition: {
                curve: 'easeInOut',
                duration: 300
            },
            inTransition: {
                curve: 'easeInOut',
                duration: 300
            },
            toggleMode: ToggleButton.TOGGLE,
            crossfade: true
        };

        this._eventOutput = new EventHandler();
        EventHandler.setOutputHandler(this, this._eventOutput);

        this.offSurface = new Surface();
        this.offSurface.on('click', function() {
            if (this.options.toggleMode !== ToggleButton.OFF) this.select();
        }.bind(this));
        this.offSurface.pipe(this._eventOutput);

        this.onSurface = new Surface();
        this.onSurface.on('click', function() {
            if (this.options.toggleMode !== ToggleButton.ON) this.deselect();
        }.bind(this));
        this.onSurface.pipe(this._eventOutput);

        this.arbiter = new RenderController({
            overlap: this.options.crossfade
        });

        this.deselect();

        if (options) this.setOptions(options);
    }

    ToggleButton.OFF = 0;
    ToggleButton.ON = 1;
    ToggleButton.TOGGLE = 2;

    /**
     * Transition towards the 'on' state and dispatch an event to
     *  listeners to announce it was selected
     *
     * @method select
     */
    ToggleButton.prototype.select = function select() {
        this.selected = true;
        this.arbiter.show(this.onSurface, this.options.inTransition);
        //        this.arbiter.setMode(ToggleButton.ON, this.options.inTransition);
        this._eventOutput.emit('select');
    };

    /**
     * Transition towards the 'off' state and dispatch an event to
     *  listeners to announce it was deselected
     *
     * @method deselect
     */
    ToggleButton.prototype.deselect = function deselect() {
        this.selected = false;
        this.arbiter.show(this.offSurface, this.options.outTransition);
        this._eventOutput.emit('deselect');
    };

    /**
     * Return the state of the button
     *
     * @method isSelected
     *
     * @return {boolean} selected state
     */
    ToggleButton.prototype.isSelected = function isSelected() {
        return this.selected;
    };

    /**
     * Override the current options
     *
     * @method setOptions
     *
     * @param {object} options JSON
     */
    ToggleButton.prototype.setOptions = function setOptions(options) {
        if (options.content !== undefined) {
            this.options.content = options.content;
            this.offSurface.setContent(this.options.content);
            this.onSurface.setContent(this.options.content);
        }
        if (options.offClasses) {
            this.options.offClasses = options.offClasses;
            this.offSurface.setClasses(this.options.offClasses);
        }
        if (options.onClasses) {
            this.options.onClasses = options.onClasses;
            this.onSurface.setClasses(this.options.onClasses);
        }
        if (options.size !== undefined) {
            this.options.size = options.size;
            this.onSurface.setSize(this.options.size);
            this.offSurface.setSize(this.options.size);
        }
        if (options.toggleMode !== undefined) this.options.toggleMode = options.toggleMode;
        if (options.outTransition !== undefined) this.options.outTransition = options.outTransition;
        if (options.inTransition !== undefined) this.options.inTransition = options.inTransition;
        if (options.crossfade !== undefined) {
            this.options.crossfade = options.crossfade;
            this.arbiter.setOptions({
                overlap: this.options.crossfade
            });
        }
    };

    /**
     * Return the size defined in the options object
     *
     * @method getSize
     *
     * @return {array} two element array [height, width]
     */
    ToggleButton.prototype.getSize = function getSize() {
        return this.options.size;
    };

    /**
     * Generate a render spec from the contents of this component.
     *
     * @private
     * @method render
     * @return {number} Render spec for this component
     */
    ToggleButton.prototype.render = function render() {
        return this.arbiter.render();
    };

    module.exports = ToggleButton;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/widgets/TabBar', ['require', 'exports', 'module', 'famous/utilities/Utility', 'famous/core/View', 'famous/views/GridLayout', './ToggleButton'], function(require, exports, module) {
    var Utility = require('famous/utilities/Utility');
    var View = require('famous/core/View');
    var GridLayout = require('famous/views/GridLayout');
    var ToggleButton = require('./ToggleButton');

    /**
     * A view for displaying various tabs that dispatch events
     *  based on the id of the button that was clicked
     *
     * @class TabBar
     * @extends View
     * @constructor
     *
     * @param {object} options overrides of default options
     */
    function TabBar(options) {
        View.apply(this, arguments);

        this.layout = new GridLayout();
        this.buttons = [];
        this._buttonIds = {};
        this._buttonCallbacks = {};

        this.layout.sequenceFrom(this.buttons);
        this._add(this.layout);

        this._optionsManager.on('change', _updateOptions.bind(this));
    }

    TabBar.prototype = Object.create(View.prototype);
    TabBar.prototype.constructor = TabBar;

    TabBar.DEFAULT_OPTIONS = {
        sections: [],
        widget: ToggleButton,
        size: [undefined, 50],
        direction: Utility.Direction.X,
        buttons: {
            toggleMode: ToggleButton.ON
        }
    };

    /**
     * Update the options for all components of the view
     *
     * @method _updateOptions
     *
     * @param {object} data component options
     */
    function _updateOptions(data) {
        var id = data.id;
        var value = data.value;

        if (id === 'direction') {
            this.layout.setOptions({
                dimensions: _resolveGridDimensions.call(this.buttons.length, this.options.direction)
            });
        } else if (id === 'buttons') {
            for (var i in this.buttons) {
                this.buttons[i].setOptions(value);
            }
        } else if (id === 'sections') {
            for (var sectionId in this.options.sections) {
                this.defineSection(sectionId, this.options.sections[sectionId]);
            }
        }
    }

    /**
     * Return an array of the proper dimensions for the tabs
     *
     * @method _resolveGridDimensions
     *
     * @param {number} count number of buttons
     * @param {number} direction direction of the layout
     *
     * @return {array} the dimensions of the tab section
     */
    function _resolveGridDimensions(count, direction) {
        if (direction === Utility.Direction.X) return [count, 1];
        else return [1, count];
    }

    /**
     * Create a new button with the specified id.  If one already exists with
     *  that id, unbind all listeners.
     *
     * @method defineSection
     *
     * @param {string} id name of the button
     * @param {object} content data for the creation of a new ToggleButton
     */
    TabBar.prototype.defineSection = function defineSection(id, content) {
        var button;
        var i = this._buttonIds[id];

        if (i === undefined) {
            i = this.buttons.length;
            this._buttonIds[id] = i;
            var widget = this.options.widget;
            button = new widget();
            this.buttons[i] = button;
            this.layout.setOptions({
                dimensions: _resolveGridDimensions(this.buttons.length, this.options.direction)
            });
        } else {
            button = this.buttons[i];
            button.unbind('select', this._buttonCallbacks[id]);
        }

        if (this.options.buttons) button.setOptions(this.options.buttons);
        button.setOptions(content);

        this._buttonCallbacks[id] = this.select.bind(this, id);
        button.on('select', this._buttonCallbacks[id]);
    };

    /**
     * Select a particular button and dispatch the id of the selection
     *  to any listeners.  Deselect all others
     *
     * @method select
     *
     * @param {string} id button id
     */
    TabBar.prototype.select = function select(id) {
        var btn = this._buttonIds[id];
        // this prevents event loop
        if (this.buttons[btn] && this.buttons[btn].isSelected()) {
            this._eventOutput.emit('select', {
                id: id
            });
        } else if (this.buttons[btn]) {
            this.buttons[btn].select();
        }

        for (var i = 0; i < this.buttons.length; i++) {
            if (i !== btn) this.buttons[i].deselect();
        }
    };

    module.exports = TabBar;
});
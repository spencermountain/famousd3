/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/surfaces/CanvasSurface', ['require', 'exports', 'module', 'famous/core/Surface'], function(require, exports, module) {
    var Surface = require('famous/core/Surface');

    /**
     * A surface containing an HTML5 Canvas element.
     *   This extends the Surface class.
     *
     * @class CanvasSurface
     * @extends Surface
     * @constructor
     * @param {Object} [options] overrides of default options
     * @param {Array.Number} [options.canvasSize] [width, height] for document element
     */
    function CanvasSurface(options) {
        if (options && options.canvasSize) this._canvasSize = options.canvasSize;
        Surface.apply(this, arguments);
        if (!this._canvasSize) this._canvasSize = this.getSize();
        this._backBuffer = document.createElement('canvas');
        if (this._canvasSize) {
            this._backBuffer.width = this._canvasSize[0];
            this._backBuffer.height = this._canvasSize[1];
        }
        this._contextId = undefined;
    }

    CanvasSurface.prototype = Object.create(Surface.prototype);
    CanvasSurface.prototype.constructor = CanvasSurface;
    CanvasSurface.prototype.elementType = 'canvas';
    CanvasSurface.prototype.elementClass = 'famous-surface';

    /**
     * Set inner document content.  Note that this is a noop for CanvasSurface.
     *
     * @method setContent
     *
     */
    CanvasSurface.prototype.setContent = function setContent() {};

    /**
     * Place the document element this component manages into the document.
     *    This will draw the content to the document.
     *
     * @private
     * @method deploy
     * @param {Node} target document parent of this container
     */
    CanvasSurface.prototype.deploy = function deploy(target) {
        if (this._canvasSize) {
            target.width = this._canvasSize[0];
            target.height = this._canvasSize[1];
        }
        if (this._contextId === '2d') {
            target.getContext(this._contextId).drawImage(this._backBuffer, 0, 0);
            this._backBuffer.width = 0;
            this._backBuffer.height = 0;
        }
    };

    /**
     * Remove this component and contained content from the document
     *
     * @private
     * @method recall
     *
     * @param {Node} target node to which the component was deployed
     */
    CanvasSurface.prototype.recall = function recall(target) {
        var size = this.getSize();

        this._backBuffer.width = target.width;
        this._backBuffer.height = target.height;

        if (this._contextId === '2d') {
            this._backBuffer.getContext(this._contextId).drawImage(target, 0, 0);
            target.width = 0;
            target.height = 0;
        }
    };

    /**
     * Returns the canvas element's context
     *
     * @method getContext
     * @param {string} contextId context identifier
     */
    CanvasSurface.prototype.getContext = function getContext(contextId) {
        this._contextId = contextId;
        return this._currTarget ? this._currTarget.getContext(contextId) : this._backBuffer.getContext(contextId);
    };

    /**
     *  Set the size of the surface and canvas element.
     *
     *  @method setSize
     *  @param {Array.number} size [width, height] of surface
     *  @param {Array.number} canvasSize [width, height] of canvas surface
     */
    CanvasSurface.prototype.setSize = function setSize(size, canvasSize) {
        Surface.prototype.setSize.apply(this, arguments);
        if (canvasSize) this._canvasSize = [canvasSize[0], canvasSize[1]];
        if (this._currTarget) {
            this._currTarget.width = this._canvasSize[0];
            this._currTarget.height = this._canvasSize[1];
        }
    };

    module.exports = CanvasSurface;
});


define('famous/surfaces/FormContainerSurface', ['require', 'exports', 'module', './ContainerSurface'], function(require, exports, module) {
    var ContainerSurface = require('./ContainerSurface');

    function FormContainerSurface(options) {
        if (options) this._method = options.method || '';
        ContainerSurface.apply(this, arguments);
    }

    FormContainerSurface.prototype = Object.create(ContainerSurface.prototype);
    FormContainerSurface.prototype.constructor = FormContainerSurface;

    FormContainerSurface.prototype.elementType = 'form';

    FormContainerSurface.prototype.deploy = function deploy(target) {
        if (this._method) target.method = this._method;
        return ContainerSurface.prototype.deploy.apply(this, arguments);
    };

    module.exports = FormContainerSurface;
});


/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/surfaces/ImageSurface', ['require', 'exports', 'module', 'famous/core/Surface'], function(require, exports, module) {
    var Surface = require('famous/core/Surface');

    /**
     * A surface containing image content.
     *   This extends the Surface class.
     *
     * @class ImageSurface
     *
     * @extends Surface
     * @constructor
     * @param {Object} [options] overrides of default options
     */
    function ImageSurface(options) {
        this._imageUrl = undefined;
        Surface.apply(this, arguments);
    }

    ImageSurface.prototype = Object.create(Surface.prototype);
    ImageSurface.prototype.constructor = ImageSurface;
    ImageSurface.prototype.elementType = 'img';
    ImageSurface.prototype.elementClass = 'famous-surface';

    /**
     * Set content URL.  This will cause a re-rendering.
     * @method setContent
     * @param {string} imageUrl
     */
    ImageSurface.prototype.setContent = function setContent(imageUrl) {
        this._imageUrl = imageUrl;
        this._contentDirty = true;
    };

    /**
     * Place the document element that this component manages into the document.
     *
     * @private
     * @method deploy
     * @param {Node} target document parent of this container
     */
    ImageSurface.prototype.deploy = function deploy(target) {
        target.src = this._imageUrl || '';
    };

    /**
     * Remove this component and contained content from the document
     *
     * @private
     * @method recall
     *
     * @param {Node} target node to which the component was deployed
     */
    ImageSurface.prototype.recall = function recall(target) {
        target.src = '';
    };

    module.exports = ImageSurface;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/surfaces/InputSurface', ['require', 'exports', 'module', 'famous/core/Surface'], function(require, exports, module) {
    var Surface = require('famous/core/Surface');

    /**
     * A Famo.us surface in the form of an HTML input element.
     *   This extends the Surface class.
     *
     * @class InputSurface
     * @extends Surface
     * @constructor
     * @param {Object} [options] overrides of default options
     * @param {string} [options.placeholder] placeholder text hint that describes the expected value of an <input> element
     * @param {string} [options.type] specifies the type of element to display (e.g. 'datetime', 'text', 'button', etc.)
     * @param {string} [options.value] value of text
     */
    function InputSurface(options) {
        this._placeholder = options.placeholder || '';
        this._value = options.value || '';
        this._type = options.type || 'text';
        this._name = options.name || '';

        Surface.apply(this, arguments);

        this.on('click', this.focus.bind(this));
        window.addEventListener('click', function(event) {
            if (event.target !== this._currTarget) this.blur();
        }.bind(this));
    }
    InputSurface.prototype = Object.create(Surface.prototype);
    InputSurface.prototype.constructor = InputSurface;

    InputSurface.prototype.elementType = 'input';
    InputSurface.prototype.elementClass = 'famous-surface';

    /**
     * Set placeholder text.  Note: Triggers a repaint.
     *
     * @method setPlaceholder
     * @param {string} str Value to set the placeholder to.
     * @return {InputSurface} this, allowing method chaining.
     */
    InputSurface.prototype.setPlaceholder = function setPlaceholder(str) {
        this._placeholder = str;
        this._contentDirty = true;
        return this;
    };

    /**
     * Focus on the current input, pulling up the keyboard on mobile.
     *
     * @method focus
     * @return {InputSurface} this, allowing method chaining.
     */
    InputSurface.prototype.focus = function focus() {
        if (this._currTarget) this._currTarget.focus();
        return this;
    };

    /**
     * Blur the current input, hiding the keyboard on mobile.
     *
     * @method blur
     * @return {InputSurface} this, allowing method chaining.
     */
    InputSurface.prototype.blur = function blur() {
        if (this._currTarget) this._currTarget.blur();
        return this;
    };

    /**
     * Set the placeholder conent.
     *   Note: Triggers a repaint next tick.
     *
     * @method setValue
     * @param {string} str Value to set the main input value to.
     * @return {InputSurface} this, allowing method chaining.
     */
    InputSurface.prototype.setValue = function setValue(str) {
        this._value = str;
        this._contentDirty = true;
        return this;
    };

    /**
     * Set the type of element to display conent.
     *   Note: Triggers a repaint next tick.
     *
     * @method setType
     * @param {string} str type of the input surface (e.g. 'button', 'text')
     * @return {InputSurface} this, allowing method chaining.
     */
    InputSurface.prototype.setType = function setType(str) {
        this._type = str;
        this._contentDirty = true;
        return this;
    };

    /**
     * Get the value of the inner content of the element (e.g. the entered text)
     *
     * @method getValue
     * @return {string} value of element
     */
    InputSurface.prototype.getValue = function getValue() {
        if (this._currTarget) {
            return this._currTarget.value;
        } else {
            return this._value;
        }
    };

    /**
     * Set the name attribute of the element.
     *   Note: Triggers a repaint next tick.
     *
     * @method setName
     * @param {string} str element name
     * @return {InputSurface} this, allowing method chaining.
     */
    InputSurface.prototype.setName = function setName(str) {
        this._name = str;
        this._contentDirty = true;
        return this;
    };

    /**
     * Get the name attribute of the element.
     *
     * @method getName
     * @return {string} name of element
     */
    InputSurface.prototype.getName = function getName() {
        return this._name;
    };

    /**
     * Place the document element this component manages into the document.
     *
     * @private
     * @method deploy
     * @param {Node} target document parent of this container
     */
    InputSurface.prototype.deploy = function deploy(target) {
        if (this._placeholder !== '') target.placeholder = this._placeholder;
        target.value = this._value;
        target.type = this._type;
        target.name = this._name;
    };

    module.exports = InputSurface;
});

define('famous/surfaces/SubmitInputSurface', ['require', 'exports', 'module', './InputSurface'], function(require, exports, module) {
    var InputSurface = require('./InputSurface');

    function SubmitInputSurface(options) {
        InputSurface.apply(this, arguments);
        this._type = 'submit';
        if (options && options.onClick) this.setOnClick(options.onClick);
    }

    SubmitInputSurface.prototype = Object.create(InputSurface.prototype);
    SubmitInputSurface.prototype.constructor = SubmitInputSurface;

    SubmitInputSurface.prototype.setOnClick = function(onClick) {
        this.onClick = onClick;
    };

    SubmitInputSurface.prototype.deploy = function deploy(target) {
        if (this.onclick) target.onClick = this.onClick;
        InputSurface.prototype.deploy.apply(this, arguments);
    };

    module.exports = SubmitInputSurface;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/surfaces/TextareaSurface', ['require', 'exports', 'module', 'famous/core/Surface'], function(require, exports, module) {
    var Surface = require('famous/core/Surface');

    /**
     * A Famo.us surface in the form of an HTML textarea element.
     *   This extends the Surface class.
     *
     * @class TextareaSurface
     * @extends Surface
     * @constructor
     * @param {Object} [options] overrides of default options
     * @param {string} [options.placeholder] placeholder text hint that describes the expected value of an textarea element
     * @param {string} [options.value] value of text
     * @param {string} [options.name] specifies the name of textarea
     * @param {string} [options.wrap] specify 'hard' or 'soft' wrap for textarea
     * @param {number} [options.cols] number of columns in textarea
     * @param {number} [options.rows] number of rows in textarea
     */
    function TextareaSurface(options) {
        this._placeholder = options.placeholder || '';
        this._value = options.value || '';
        this._name = options.name || '';
        this._wrap = options.wrap || '';
        this._cols = options.cols || '';
        this._rows = options.rows || '';

        Surface.apply(this, arguments);
        this.on('click', this.focus.bind(this));
    }
    TextareaSurface.prototype = Object.create(Surface.prototype);
    TextareaSurface.prototype.constructor = TextareaSurface;

    TextareaSurface.prototype.elementType = 'textarea';
    TextareaSurface.prototype.elementClass = 'famous-surface';

    /**
     * Set placeholder text.  Note: Triggers a repaint.
     *
     * @method setPlaceholder
     * @param {string} str Value to set the placeholder to.
     * @return {TextareaSurface} this, allowing method chaining.
     */
    TextareaSurface.prototype.setPlaceholder = function setPlaceholder(str) {
        this._placeholder = str;
        this._contentDirty = true;
        return this;
    };

    /**
     * Focus on the current input, pulling up the keyboard on mobile.
     *
     * @method focus
     * @return {TextareaSurface} this, allowing method chaining.
     */
    TextareaSurface.prototype.focus = function focus() {
        if (this._currTarget) this._currTarget.focus();
        return this;
    };

    /**
     * Blur the current input, hiding the keyboard on mobile.
     *
     * @method focus
     * @return {TextareaSurface} this, allowing method chaining.
     */
    TextareaSurface.prototype.blur = function blur() {
        if (this._currTarget) this._currTarget.blur();
        return this;
    };

    /**
     * Set the value of textarea.
     *   Note: Triggers a repaint next tick.
     *
     * @method setValue
     * @param {string} str Value to set the main textarea value to.
     * @return {TextareaSurface} this, allowing method chaining.
     */
    TextareaSurface.prototype.setValue = function setValue(str) {
        this._value = str;
        this._contentDirty = true;
        return this;
    };

    /**
     * Get the value of the inner content of the textarea (e.g. the entered text)
     *
     * @method getValue
     * @return {string} value of element
     */
    TextareaSurface.prototype.getValue = function getValue() {
        if (this._currTarget) {
            return this._currTarget.value;
        } else {
            return this._value;
        }
    };

    /**
     * Set the name attribute of the element.
     *   Note: Triggers a repaint next tick.
     *
     * @method setName
     * @param {string} str element name
     * @return {TextareaSurface} this, allowing method chaining.
     */
    TextareaSurface.prototype.setName = function setName(str) {
        this._name = str;
        this._contentDirty = true;
        return this;
    };

    /**
     * Get the name attribute of the element.
     *
     * @method getName
     * @return {string} name of element
     */
    TextareaSurface.prototype.getName = function getName() {
        return this._name;
    };

    /**
     * Set the wrap of textarea.
     *   Note: Triggers a repaint next tick.
     *
     * @method setWrap
     * @param {string} str wrap of the textarea surface (e.g. 'soft', 'hard')
     * @return {TextareaSurface} this, allowing method chaining.
     */
    TextareaSurface.prototype.setWrap = function setWrap(str) {
        this._wrap = str;
        this._contentDirty = true;
        return this;
    };

    /**
     * Set the number of columns visible in the textarea.
     *   Note: Overridden by surface size; set width to true. (eg. size: [true, *])
     *         Triggers a repaint next tick.
     *
     * @method setColumns
     * @param {number} num columns in textarea surface
     * @return {TextareaSurface} this, allowing method chaining.
     */
    TextareaSurface.prototype.setColumns = function setColumns(num) {
        this._cols = num;
        this._contentDirty = true;
        return this;
    };

    /**
     * Set the number of rows visible in the textarea.
     *   Note: Overridden by surface size; set height to true. (eg. size: [*, true])
     *         Triggers a repaint next tick.
     *
     * @method setRows
     * @param {number} num rows in textarea surface
     * @return {TextareaSurface} this, allowing method chaining.
     */
    TextareaSurface.prototype.setRows = function setRows(num) {
        this._rows = num;
        this._contentDirty = true;
        return this;
    };

    /**
     * Place the document element this component manages into the document.
     *
     * @private
     * @method deploy
     * @param {Node} target document parent of this container
     */
    TextareaSurface.prototype.deploy = function deploy(target) {
        if (this._placeholder !== '') target.placeholder = this._placeholder;
        if (this._value !== '') target.value = this._value;
        if (this._name !== '') target.name = this._name;
        if (this._wrap !== '') target.wrap = this._wrap;
        if (this._cols !== '') target.cols = this._cols;
        if (this._rows !== '') target.rows = this._rows;
    };

    module.exports = TextareaSurface;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: mark@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/surfaces/VideoSurface', ['require', 'exports', 'module', 'famous/core/Surface'], function(require, exports, module) {
    var Surface = require('famous/core/Surface');

    /**
     * Creates a famous surface containing video content. Currently adding
     *   controls and manipulating the video are not supported through the
     *   surface interface, but can be accomplished via standard JavaScript
     *   manipulation of the video DOM element.
     *   This extends the Surface class.
     *
     * @class VideoSurface
     * @extends Surface
     * @constructor
     * @param {Object} [options] default option overrides
     * @param {Array.Number} [options.size] [width, height] in pixels
     * @param {Array.string} [options.classes] CSS classes to set on inner content
     * @param {Array} [options.properties] string dictionary of HTML attributes to set on target div
     * @param {string} [options.content] inner (HTML) content of surface
     * @param {boolean} [options.autoplay] autoplay
     */
    function VideoSurface(options) {
        this._videoUrl = undefined;
        this.options = Object.create(VideoSurface.DEFAULT_OPTIONS);
        if (options) this.setOptions(options);

        Surface.apply(this, arguments);
    }
    VideoSurface.prototype = Object.create(Surface.prototype);
    VideoSurface.prototype.constructor = VideoSurface;

    VideoSurface.DEFAULT_OPTIONS = {
        autoplay: false
    };

    VideoSurface.prototype.elementType = 'video';
    VideoSurface.prototype.elementClass = 'famous-surface';

    /**
     * Set internal options, overriding any default options
     *
     * @method setOptions
     *
     * @param {Object} [options] overrides of default options
     * @param {Boolean} [options.autoplay] HTML autoplay
     */
    VideoSurface.prototype.setOptions = function setOptions(options) {
        for (var key in VideoSurface.DEFAULT_OPTIONS) {
            if (options[key] !== undefined) this.options[key] = options[key];
        }
    };

    /**
     * Set url of the video.
     *
     * @method setContent
     * @param {string} videoUrl URL
     */
    VideoSurface.prototype.setContent = function setContent(videoUrl) {
        this._videoUrl = videoUrl;
        this._contentDirty = true;
    };

    /**
     * Place the document element this component manages into the document.
     *   Note: In the case of VideoSurface, simply changes the options on the target.
     *
     * @private
     * @method deploy
     * @param {Node} target document parent of this container
     */
    VideoSurface.prototype.deploy = function deploy(target) {
        target.src = this._videoUrl;
        target.autoplay = this.options.autoplay;
    };

    /**
     * Remove this component and contained content from the document.
     *   Note: This doesn't actually remove the <video> element from the
     *   document.
     * @private
     * @method recall
     *
     * @param {Node} target node to which the component was deployed
     */
    VideoSurface.prototype.recall = function recall(target) {
        target.src = '';
    };

    module.exports = VideoSurface;
});
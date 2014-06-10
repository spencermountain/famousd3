/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/physics/bodies/Body', ['require', 'exports', 'module', './Particle', 'famous/core/Transform', 'famous/math/Vector', 'famous/math/Quaternion', 'famous/math/Matrix'], function(require, exports, module) {
    var Particle = require('./Particle');
    var Transform = require('famous/core/Transform');
    var Vector = require('famous/math/Vector');
    var Quaternion = require('famous/math/Quaternion');
    var Matrix = require('famous/math/Matrix');

    /**
     * A unit controlled by the physics engine which extends the zero-dimensional
     * Particle to include geometry. In addition to maintaining the state
     * of a Particle its state includes orientation, angular velocity
     * and angular momentum and responds to torque forces.
     *
     * @class Body
     * @extends Particle
     * @constructor
     */
    function Body(options) {
        Particle.call(this, options);
        options = options || {};

        this.orientation = new Quaternion();
        this.angularVelocity = new Vector();
        this.angularMomentum = new Vector();
        this.torque = new Vector();

        if (options.orientation) this.orientation.set(options.orientation);
        if (options.angularVelocity) this.angularVelocity.set(options.angularVelocity);
        if (options.angularMomentum) this.angularMomentum.set(options.angularMomentum);
        if (options.torque) this.torque.set(options.torque);

        this.setMomentsOfInertia();

        this.angularVelocity.w = 0; //quaternify the angular velocity

        //registers
        this.pWorld = new Vector(); //placeholder for world space position
    }

    Body.DEFAULT_OPTIONS = Particle.DEFAULT_OPTIONS;
    Body.DEFAULT_OPTIONS.orientation = [0, 0, 0, 1];
    Body.DEFAULT_OPTIONS.angularVelocity = [0, 0, 0];

    Body.AXES = Particle.AXES;
    Body.SLEEP_TOLERANCE = Particle.SLEEP_TOLERANCE;
    Body.INTEGRATOR = Particle.INTEGRATOR;

    Body.prototype = Object.create(Particle.prototype);
    Body.prototype.constructor = Body;

    Body.prototype.isBody = true;

    Body.prototype.setMass = function setMass() {
        Particle.prototype.setMass.apply(this, arguments);
        this.setMomentsOfInertia();
    };

    /**
     * Setter for moment of inertia, which is necessary to give proper
     * angular inertia depending on the geometry of the body.
     *
     * @method setMomentsOfInertia
     */
    Body.prototype.setMomentsOfInertia = function setMomentsOfInertia() {
        this.inertia = new Matrix();
        this.inverseInertia = new Matrix();
    };

    /**
     * Update the angular velocity from the angular momentum state.
     *
     * @method updateAngularVelocity
     */
    Body.prototype.updateAngularVelocity = function updateAngularVelocity() {
        this.angularVelocity.set(this.inverseInertia.vectorMultiply(this.angularMomentum));
    };

    /**
     * Determine world coordinates from the local coordinate system. Useful
     * if the Body has rotated in space.
     *
     * @method toWorldCoordinates
     * @param localPosition {Vector} local coordinate vector
     * @return global coordinate vector {Vector}
     */
    Body.prototype.toWorldCoordinates = function toWorldCoordinates(localPosition) {
        return this.pWorld.set(this.orientation.rotateVector(localPosition));
    };

    /**
     * Calculates the kinetic and intertial energy of a body.
     *
     * @method getEnergy
     * @return energy {Number}
     */
    Body.prototype.getEnergy = function getEnergy() {
        return Particle.prototype.getEnergy.call(this) + 0.5 * this.inertia.vectorMultiply(this.angularVelocity).dot(this.angularVelocity);
    };

    /**
     * Extends Particle.reset to reset orientation, angular velocity
     * and angular momentum.
     *
     * @method reset
     * @param [p] {Array|Vector} position
     * @param [v] {Array|Vector} velocity
     * @param [q] {Array|Quaternion} orientation
     * @param [L] {Array|Vector} angular momentum
     */
    Body.prototype.reset = function reset(p, v, q, L) {
        Particle.prototype.reset.call(this, p, v);
        this.angularVelocity.clear();
        this.setOrientation(q || [1, 0, 0, 0]);
        this.setAngularMomentum(L || [0, 0, 0]);
    };

    /**
     * Setter for orientation
     *
     * @method setOrientation
     * @param q {Array|Quaternion} orientation
     */
    Body.prototype.setOrientation = function setOrientation(q) {
        this.orientation.set(q);
    };

    /**
     * Setter for angular velocity
     *
     * @method setAngularVelocity
     * @param w {Array|Vector} angular velocity
     */
    Body.prototype.setAngularVelocity = function setAngularVelocity(w) {
        this.wake();
        this.angularVelocity.set(w);
    };

    /**
     * Setter for angular momentum
     *
     * @method setAngularMomentum
     * @param L {Array|Vector} angular momentum
     */
    Body.prototype.setAngularMomentum = function setAngularMomentum(L) {
        this.wake();
        this.angularMomentum.set(L);
    };

    /**
     * Extends Particle.applyForce with an optional argument
     * to apply the force at an off-centered location, resulting in a torque.
     *
     * @method applyForce
     * @param force {Vector} force
     * @param [location] {Vector} off-center location on the body
     */
    Body.prototype.applyForce = function applyForce(force, location) {
        Particle.prototype.applyForce.call(this, force);
        if (location !== undefined) this.applyTorque(location.cross(force));
    };

    /**
     * Applied a torque force to a body, inducing a rotation.
     *
     * @method applyTorque
     * @param torque {Vector} torque
     */
    Body.prototype.applyTorque = function applyTorque(torque) {
        this.wake();
        this.torque.set(this.torque.add(torque));
    };

    /**
     * Extends Particle.getTransform to include a rotational component
     * derived from the particle's orientation.
     *
     * @method getTransform
     * @return transform {Transform}
     */
    Body.prototype.getTransform = function getTransform() {
        return Transform.thenMove(
            this.orientation.getTransform(),
            Transform.getTranslate(Particle.prototype.getTransform.call(this))
        );
    };

    /**
     * Extends Particle._integrate to also update the rotational states
     * of the body.
     *
     * @method getTransform
     * @protected
     * @param dt {Number} delta time
     */
    Body.prototype._integrate = function _integrate(dt) {
        Particle.prototype._integrate.call(this, dt);
        this.integrateAngularMomentum(dt);
        this.updateAngularVelocity(dt);
        this.integrateOrientation(dt);
    };

    /**
     * Updates the angular momentum via the its integrator.
     *
     * @method integrateAngularMomentum
     * @param dt {Number} delta time
     */
    Body.prototype.integrateAngularMomentum = function integrateAngularMomentum(dt) {
        Body.INTEGRATOR.integrateAngularMomentum(this, dt);
    };

    /**
     * Updates the orientation via the its integrator.
     *
     * @method integrateOrientation
     * @param dt {Number} delta time
     */
    Body.prototype.integrateOrientation = function integrateOrientation(dt) {
        Body.INTEGRATOR.integrateOrientation(this, dt);
    };

    module.exports = Body;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/physics/bodies/Circle', ['require', 'exports', 'module', './Body', 'famous/math/Matrix'], function(require, exports, module) {
    var Body = require('./Body');
    var Matrix = require('famous/math/Matrix');

    /**
     * Implements a circle, or spherical, geometry for an Body with
     * radius.
     *
     * @class Circle
     * @extends Body
     * @constructor
     */
    function Circle(options) {
        options = options || {};
        this.setRadius(options.radius || 0);
        Body.call(this, options);
    }

    Circle.prototype = Object.create(Body.prototype);
    Circle.prototype.constructor = Circle;

    /**
     * Basic setter for radius.
     * @method setRadius
     * @param r {Number} radius
     */
    Circle.prototype.setRadius = function setRadius(r) {
        this.radius = r;
        this.size = [2 * this.radius, 2 * this.radius];
        this.setMomentsOfInertia();
    };

    Circle.prototype.setMomentsOfInertia = function setMomentsOfInertia() {
        var m = this.mass;
        var r = this.radius;

        this.inertia = new Matrix([
            [0.25 * m * r * r, 0, 0],
            [0, 0.25 * m * r * r, 0],
            [0, 0, 0.5 * m * r * r]
        ]);

        this.inverseInertia = new Matrix([
            [4 / (m * r * r), 0, 0],
            [0, 4 / (m * r * r), 0],
            [0, 0, 2 / (m * r * r)]
        ]);
    };

    module.exports = Circle;

});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/physics/bodies/Rectangle', ['require', 'exports', 'module', './Body', 'famous/math/Matrix'], function(require, exports, module) {
    var Body = require('./Body');
    var Matrix = require('famous/math/Matrix');

    /**
     * Implements a rectangular geometry for an Body with
     * size = [width, height].
     *
     * @class Rectangle
     * @extends Body
     * @constructor
     */
    function Rectangle(options) {
        options = options || {};
        this.size = options.size || [0, 0];
        Body.call(this, options);
    }

    Rectangle.prototype = Object.create(Body.prototype);
    Rectangle.prototype.constructor = Rectangle;

    /**
     * Basic setter for size.
     * @method setSize
     * @param size {Array} size = [width, height]
     */
    Rectangle.prototype.setSize = function setSize(size) {
        this.size = size;
        this.setMomentsOfInertia();
    };

    Rectangle.prototype.setMomentsOfInertia = function setMomentsOfInertia() {
        var m = this.mass;
        var w = this.size[0];
        var h = this.size[1];

        this.inertia = new Matrix([
            [m * h * h / 12, 0, 0],
            [0, m * w * w / 12, 0],
            [0, 0, m * (w * w + h * h) / 12]
        ]);

        this.inverseInertia = new Matrix([
            [12 / (m * h * h), 0, 0],
            [0, 12 / (m * w * w), 0],
            [0, 0, 12 / (m * (w * w + h * h))]
        ]);
    };

    module.exports = Rectangle;

});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/physics/constraints/Collision', ['require', 'exports', 'module', './Constraint', 'famous/math/Vector'], function(require, exports, module) {
    var Constraint = require('./Constraint');
    var Vector = require('famous/math/Vector');

    /**
     *  Allows for two circular bodies to collide and bounce off each other.
     *
     *  @class Collision
     *  @constructor
     *  @extends Constraint
     *  @param {Options} [options] An object of configurable options.
     *  @param {Number} [options.restitution] The energy ratio lost in a collision (0 = stick, 1 = elastic) Range : [0, 1]
     *  @param {Number} [options.drift] Baumgarte stabilization parameter. Makes constraints "loosely" (0) or "tightly" (1) enforced. Range : [0, 1]
     *  @param {Number} [options.slop] Amount of penetration in pixels to ignore before collision event triggers
     *
     */
    function Collision(options) {
        this.options = Object.create(Collision.DEFAULT_OPTIONS);
        if (options) this.setOptions(options);

        //registers
        this.normal = new Vector();
        this.pDiff = new Vector();
        this.vDiff = new Vector();
        this.impulse1 = new Vector();
        this.impulse2 = new Vector();

        Constraint.call(this);
    }

    Collision.prototype = Object.create(Constraint.prototype);
    Collision.prototype.constructor = Collision;

    Collision.DEFAULT_OPTIONS = {
        restitution: 0.5,
        drift: 0.5,
        slop: 0
    };

    function _normalVelocity(particle1, particle2) {
        return particle1.velocity.dot(particle2.velocity);
    }

    /*
     * Setter for options.
     *
     * @method setOptions
     * @param options {Objects}
     */
    Collision.prototype.setOptions = function setOptions(options) {
        for (var key in options) this.options[key] = options[key];
    };

    /**
     * Adds an impulse to a physics body's velocity due to the constraint
     *
     * @method applyConstraint
     * @param targets {Array.Body}  Array of bodies to apply the constraint to
     * @param source {Body}         The source of the constraint
     * @param dt {Number}           Delta time
     */
    Collision.prototype.applyConstraint = function applyConstraint(targets, source, dt) {
        if (source === undefined) return;

        var v1 = source.velocity;
        var p1 = source.position;
        var w1 = source.inverseMass;
        var r1 = source.radius;

        var options = this.options;
        var drift = options.drift;
        var slop = -options.slop;
        var restitution = options.restitution;

        var n = this.normal;
        var pDiff = this.pDiff;
        var vDiff = this.vDiff;
        var impulse1 = this.impulse1;
        var impulse2 = this.impulse2;

        for (var i = 0; i < targets.length; i++) {
            var target = targets[i];

            if (target === source) continue;

            var v2 = target.velocity;
            var p2 = target.position;
            var w2 = target.inverseMass;
            var r2 = target.radius;

            pDiff.set(p2.sub(p1));
            vDiff.set(v2.sub(v1));

            var dist = pDiff.norm();
            var overlap = dist - (r1 + r2);
            var effMass = 1 / (w1 + w2);
            var gamma = 0;

            if (overlap < 0) {

                n.set(pDiff.normalize());

                if (this._eventOutput) {
                    var collisionData = {
                        target: target,
                        source: source,
                        overlap: overlap,
                        normal: n
                    };

                    this._eventOutput.emit('preCollision', collisionData);
                    this._eventOutput.emit('collision', collisionData);
                }

                var lambda = (overlap <= slop) ? ((1 + restitution) * n.dot(vDiff) + drift / dt * (overlap - slop)) / (gamma + dt / effMass) : ((1 + restitution) * n.dot(vDiff)) / (gamma + dt / effMass);

                n.mult(dt * lambda).put(impulse1);
                impulse1.mult(-1).put(impulse2);

                source.applyImpulse(impulse1);
                target.applyImpulse(impulse2);

                //source.setPosition(p1.add(n.mult(overlap/2)));
                //target.setPosition(p2.sub(n.mult(overlap/2)));

                if (this._eventOutput) this._eventOutput.emit('postCollision', collisionData);

            }
        }
    };

    module.exports = Collision;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/physics/constraints/Curve', ['require', 'exports', 'module', './Constraint', 'famous/math/Vector'], function(require, exports, module) {
    var Constraint = require('./Constraint');
    var Vector = require('famous/math/Vector');

    /**
     *  A constraint that keeps a physics body on a given implicit curve
     *    regardless of other physical forces are applied to it.
     *
     *    A curve constraint is two surface constraints in disguise, as a curve is
     *    the intersection of two surfaces, and is essentially constrained to both
     *
     *  @class Curve
     *  @constructor
     *  @extends Constraint
     *  @param {Options} [options] An object of configurable options.
     *  @param {Function} [options.equation] An implicitly defined surface f(x,y,z) = 0 that body is constrained to e.g. function(x,y,z) { x*x + y*y - r*r } corresponds to a circle of radius r pixels
     *  @param {Function} [options.plane] An implicitly defined second surface that the body is constrained to
     *  @param {Number} [options.period] The spring-like reaction when the constraint is violated
     *  @param {Number} [options.number] The damping-like reaction when the constraint is violated
     */
    function Curve(options) {
        this.options = Object.create(Curve.DEFAULT_OPTIONS);
        if (options) this.setOptions(options);

        //registers
        this.J = new Vector();
        this.impulse = new Vector();

        Constraint.call(this);
    }

    Curve.prototype = Object.create(Constraint.prototype);
    Curve.prototype.constructor = Curve;

    /** @const */
    var epsilon = 1e-7;
    /** @const */
    var pi = Math.PI;

    Curve.DEFAULT_OPTIONS = {
        equation: function(x, y, z) {
            return 0;
        },
        plane: function(x, y, z) {
            return z;
        },
        period: 0,
        dampingRatio: 0
    };

    /**
     * Basic options setter
     *
     * @method setOptions
     * @param options {Objects}
     */
    Curve.prototype.setOptions = function setOptions(options) {
        for (var key in options) this.options[key] = options[key];
    };

    /**
     * Adds a curve impulse to a physics body.
     *
     * @method applyConstraint
     * @param targets {Array.Body} Array of bodies to apply force to.
     * @param source {Body} Not applicable
     * @param dt {Number} Delta time
     */
    Curve.prototype.applyConstraint = function applyConstraint(targets, source, dt) {
        var options = this.options;
        var impulse = this.impulse;
        var J = this.J;

        var f = options.equation;
        var g = options.plane;
        var dampingRatio = options.dampingRatio;
        var period = options.period;

        for (var i = 0; i < targets.length; i++) {
            var body = targets[i];

            var v = body.velocity;
            var p = body.position;
            var m = body.mass;

            var gamma;
            var beta;

            if (period === 0) {
                gamma = 0;
                beta = 1;
            } else {
                var c = 4 * m * pi * dampingRatio / period;
                var k = 4 * m * pi * pi / (period * period);

                gamma = 1 / (c + dt * k);
                beta = dt * k / (c + dt * k);
            }

            var x = p.x;
            var y = p.y;
            var z = p.z;

            var f0 = f(x, y, z);
            var dfx = (f(x + epsilon, p, p) - f0) / epsilon;
            var dfy = (f(x, y + epsilon, p) - f0) / epsilon;
            var dfz = (f(x, y, p + epsilon) - f0) / epsilon;

            var g0 = g(x, y, z);
            var dgx = (g(x + epsilon, y, z) - g0) / epsilon;
            var dgy = (g(x, y + epsilon, z) - g0) / epsilon;
            var dgz = (g(x, y, z + epsilon) - g0) / epsilon;

            J.setXYZ(dfx + dgx, dfy + dgy, dfz + dgz);

            var antiDrift = beta / dt * (f0 + g0);
            var lambda = -(J.dot(v) + antiDrift) / (gamma + dt * J.normSquared() / m);

            impulse.set(J.mult(dt * lambda));
            body.applyImpulse(impulse);
        }
    };

    module.exports = Curve;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/physics/constraints/Distance', ['require', 'exports', 'module', './Constraint', 'famous/math/Vector'], function(require, exports, module) {
    var Constraint = require('./Constraint');
    var Vector = require('famous/math/Vector');

    /**
     *  A constraint that keeps a physics body a given distance away from a given
     *  anchor, or another attached body.
     *
     *
     *  @class Distance
     *  @constructor
     *  @extends Constraint
     *  @param {Options} [options] An object of configurable options.
     *  @param {Array} [options.anchor] The location of the anchor
     *  @param {Number} [options.length] The amount of distance from the anchor the constraint should enforce
     *  @param {Number} [options.minLength] The minimum distance before the constraint is activated. Use this property for a "rope" effect.
     *  @param {Number} [options.period] The spring-like reaction when the constraint is broken.
     *  @param {Number} [options.dampingRatio] The damping-like reaction when the constraint is broken.
     *
     */
    function Distance(options) {
        this.options = Object.create(this.constructor.DEFAULT_OPTIONS);
        if (options) this.setOptions(options);

        //registers
        this.impulse = new Vector();
        this.normal = new Vector();
        this.diffP = new Vector();
        this.diffV = new Vector();

        Constraint.call(this);
    }

    Distance.prototype = Object.create(Constraint.prototype);
    Distance.prototype.constructor = Distance;

    Distance.DEFAULT_OPTIONS = {
        anchor: null,
        length: 0,
        minLength: 0,
        period: 0,
        dampingRatio: 0
    };

    /** @const */
    var pi = Math.PI;

    /**
     * Basic options setter
     *
     * @method setOptions
     * @param options {Objects}
     */
    Distance.prototype.setOptions = function setOptions(options) {
        if (options.anchor) {
            if (options.anchor.position instanceof Vector) this.options.anchor = options.anchor.position;
            if (options.anchor instanceof Vector) this.options.anchor = options.anchor;
            if (options.anchor instanceof Array) this.options.anchor = new Vector(options.anchor);
        }
        if (options.length !== undefined) this.options.length = options.length;
        if (options.dampingRatio !== undefined) this.options.dampingRatio = options.dampingRatio;
        if (options.period !== undefined) this.options.period = options.period;
        if (options.minLength !== undefined) this.options.minLength = options.minLength;
    };

    function _calcError(impulse, body) {
        return body.mass * impulse.norm();
    }

    /**
     * Set the anchor position
     *
     * @method setOptions
     * @param anchor {Array}
     */
    Distance.prototype.setAnchor = function setAnchor(anchor) {
        if (!this.options.anchor) this.options.anchor = new Vector();
        this.options.anchor.set(anchor);
    };

    /**
     * Adds an impulse to a physics body's velocity due to the constraint
     *
     * @method applyConstraint
     * @param targets {Array.Body}  Array of bodies to apply the constraint to
     * @param source {Body}         The source of the constraint
     * @param dt {Number}           Delta time
     */
    Distance.prototype.applyConstraint = function applyConstraint(targets, source, dt) {
        var n = this.normal;
        var diffP = this.diffP;
        var diffV = this.diffV;
        var impulse = this.impulse;
        var options = this.options;

        var dampingRatio = options.dampingRatio;
        var period = options.period;
        var minLength = options.minLength;

        var p2;
        var w2;

        if (source) {
            var v2 = source.velocity;
            p2 = source.position;
            w2 = source.inverseMass;
        } else {
            p2 = this.options.anchor;
            w2 = 0;
        }

        var length = this.options.length;

        for (var i = 0; i < targets.length; i++) {
            var body = targets[i];

            var v1 = body.velocity;
            var p1 = body.position;
            var w1 = body.inverseMass;

            diffP.set(p1.sub(p2));
            n.set(diffP.normalize());

            var dist = diffP.norm() - length;

            //rope effect
            if (Math.abs(dist) < minLength) return;

            if (source) diffV.set(v1.sub(v2));
            else diffV.set(v1);

            var effMass = 1 / (w1 + w2);
            var gamma;
            var beta;

            if (period === 0) {
                gamma = 0;
                beta = 1;
            } else {
                var c = 4 * effMass * pi * dampingRatio / period;
                var k = 4 * effMass * pi * pi / (period * period);

                gamma = 1 / (c + dt * k);
                beta = dt * k / (c + dt * k);
            }

            var antiDrift = beta / dt * dist;
            var lambda = -(n.dot(diffV) + antiDrift) / (gamma + dt / effMass);

            impulse.set(n.mult(dt * lambda));
            body.applyImpulse(impulse);

            if (source) source.applyImpulse(impulse.mult(-1));
        }
    };

    module.exports = Distance;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/physics/constraints/Surface', ['require', 'exports', 'module', './Constraint', 'famous/math/Vector'], function(require, exports, module) {
    var Constraint = require('./Constraint');
    var Vector = require('famous/math/Vector');

    /**
     *  A constraint that keeps a physics body on a given implicit surface
     *    regardless of other physical forces are applied to it.
     *
     *  @class Surface
     *  @constructor
     *  @extends Constraint
     *  @param {Options} [options] An object of configurable options.
     *  @param {Function} [options.equation] An implicitly defined surface f(x,y,z) = 0 that body is constrained to e.g. function(x,y,z) { x*x + y*y + z*z - r*r } corresponds to a sphere of radius r pixels.
     *  @param {Number} [options.period] The spring-like reaction when the constraint is violated.
     *  @param {Number} [options.dampingRatio] The damping-like reaction when the constraint is violated.
     */
    function Surface(options) {
        this.options = Object.create(Surface.DEFAULT_OPTIONS);
        if (options) this.setOptions(options);

        this.J = new Vector();
        this.impulse = new Vector();

        Constraint.call(this);
    }

    Surface.prototype = Object.create(Constraint.prototype);
    Surface.prototype.constructor = Surface;

    Surface.DEFAULT_OPTIONS = {
        equation: undefined,
        period: 0,
        dampingRatio: 0
    };

    /** @const */
    var epsilon = 1e-7;
    /** @const */
    var pi = Math.PI;

    /**
     * Basic options setter
     *
     * @method setOptions
     * @param options {Objects}
     */
    Surface.prototype.setOptions = function setOptions(options) {
        for (var key in options) this.options[key] = options[key];
    };

    /**
     * Adds a surface impulse to a physics body.
     *
     * @method applyConstraint
     * @param targets {Array.Body} Array of bodies to apply force to.
     * @param source {Body} Not applicable
     * @param dt {Number} Delta time
     */
    Surface.prototype.applyConstraint = function applyConstraint(targets, source, dt) {
        var impulse = this.impulse;
        var J = this.J;
        var options = this.options;

        var f = options.equation;
        var dampingRatio = options.dampingRatio;
        var period = options.period;

        for (var i = 0; i < targets.length; i++) {
            var particle = targets[i];

            var v = particle.velocity;
            var p = particle.position;
            var m = particle.mass;

            var gamma;
            var beta;

            if (period === 0) {
                gamma = 0;
                beta = 1;
            } else {
                var c = 4 * m * pi * dampingRatio / period;
                var k = 4 * m * pi * pi / (period * period);

                gamma = 1 / (c + dt * k);
                beta = dt * k / (c + dt * k);
            }

            var x = p.x;
            var y = p.y;
            var z = p.z;

            var f0 = f(x, y, z);
            var dfx = (f(x + epsilon, p, p) - f0) / epsilon;
            var dfy = (f(x, y + epsilon, p) - f0) / epsilon;
            var dfz = (f(x, y, p + epsilon) - f0) / epsilon;
            J.setXYZ(dfx, dfy, dfz);

            var antiDrift = beta / dt * f0;
            var lambda = -(J.dot(v) + antiDrift) / (gamma + dt * J.normSquared() / m);

            impulse.set(J.mult(dt * lambda));
            particle.applyImpulse(impulse);
        }
    };

    module.exports = Surface;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/physics/constraints/Walls', ['require', 'exports', 'module', './Constraint', './Wall', 'famous/math/Vector'], function(require, exports, module) {
    var Constraint = require('./Constraint');
    var Wall = require('./Wall');
    var Vector = require('famous/math/Vector');

    /**
     *  Walls combines one or more Wall primitives and exposes a simple API to
     *  interact with several walls at once. A common use case would be to set up
     *  a bounding box for a physics body, that would collide with each side.
     *
     *  @class Walls
     *  @constructor
     *  @extends Constraint
     *  @uses Wall
     *  @param {Options} [options] An object of configurable options.
     *  @param {Array} [options.sides] An array of sides e.g., [Walls.LEFT, Walls.TOP]
     *  @param {Array} [options.size] The size of the bounding box of the walls.
     *  @param {Array} [options.origin] The center of the wall relative to the size.
     *  @param {Array} [options.drift] Baumgarte stabilization parameter. Makes constraints "loosely" (0) or "tightly" (1) enforced. Range : [0, 1]
     *  @param {Array} [options.slop] Amount of penetration in pixels to ignore before collision event triggers.
     *  @param {Array} [options.restitution] The energy ratio lost in a collision (0 = stick, 1 = elastic) The energy ratio lost in a collision (0 = stick, 1 = elastic)
     *  @param {Array} [options.onContact] How to handle collision against the wall.
     */
    function Walls(options) {
        this.options = Object.create(Walls.DEFAULT_OPTIONS);
        if (options) this.setOptions(options);
        _createComponents.call(this, options.sides || this.options.sides);

        Constraint.call(this);
    }

    Walls.prototype = Object.create(Constraint.prototype);
    Walls.prototype.constructor = Walls;
    /**
     * @property Walls.ON_CONTACT
     * @type Object
     * @extends Wall.ON_CONTACT
     * @static
     */
    Walls.ON_CONTACT = Wall.ON_CONTACT;

    /**
     * An enumeration of common types of walls
     *    LEFT, RIGHT, TOP, BOTTOM, FRONT, BACK
     *    TWO_DIMENSIONAL, THREE_DIMENSIONAL
     *
     * @property Walls.SIDES
     * @type Object
     * @final
     * @static
     */
    Walls.SIDES = {
        LEFT: 0,
        RIGHT: 1,
        TOP: 2,
        BOTTOM: 3,
        FRONT: 4,
        BACK: 5,
        TWO_DIMENSIONAL: [0, 1, 2, 3],
        THREE_DIMENSIONAL: [0, 1, 2, 3, 4, 5]
    };

    Walls.DEFAULT_OPTIONS = {
        sides: Walls.SIDES.TWO_DIMENSIONAL,
        size: [window.innerWidth, window.innerHeight, 0],
        origin: [.5, .5, .5],
        drift: 0.5,
        slop: 0,
        restitution: 0.5,
        onContact: Walls.ON_CONTACT.REFLECT
    };

    var _SIDE_NORMALS = {
        0: new Vector(1, 0, 0),
        1: new Vector(-1, 0, 0),
        2: new Vector(0, 1, 0),
        3: new Vector(0, -1, 0),
        4: new Vector(0, 0, 1),
        5: new Vector(0, 0, -1)
    };

    function _getDistance(side, size, origin) {
        var distance;
        var SIDES = Walls.SIDES;
        switch (parseInt(side)) {
            case SIDES.LEFT:
                distance = size[0] * origin[0];
                break;
            case SIDES.TOP:
                distance = size[1] * origin[1];
                break;
            case SIDES.FRONT:
                distance = size[2] * origin[2];
                break;
            case SIDES.RIGHT:
                distance = size[0] * (1 - origin[0]);
                break;
            case SIDES.BOTTOM:
                distance = size[1] * (1 - origin[1]);
                break;
            case SIDES.BACK:
                distance = size[2] * (1 - origin[2]);
                break;
        }
        return distance;
    }

    /*
     * Setter for options.
     *
     * @method setOptions
     * @param options {Objects}
     */
    Walls.prototype.setOptions = function setOptions(options) {
        var resizeFlag = false;
        if (options.restitution !== undefined) _setOptionsForEach.call(this, {
            restitution: options.restitution
        });
        if (options.drift !== undefined) _setOptionsForEach.call(this, {
            drift: options.drift
        });
        if (options.slop !== undefined) _setOptionsForEach.call(this, {
            slop: options.slop
        });
        if (options.onContact !== undefined) _setOptionsForEach.call(this, {
            onContact: options.onContact
        });
        if (options.size !== undefined) resizeFlag = true;
        if (options.sides !== undefined) this.options.sides = options.sides;
        if (options.origin !== undefined) resizeFlag = true;
        if (resizeFlag) this.setSize(options.size, options.origin);
    };

    function _createComponents(sides) {
        this.components = {};
        var components = this.components;

        for (var i = 0; i < sides.length; i++) {
            var side = sides[i];
            components[i] = new Wall({
                normal: _SIDE_NORMALS[side].clone(),
                distance: _getDistance(side, this.options.size, this.options.origin)
            });
        }
    }

    /*
     * Setter for size.
     *
     * @method setOptions
     * @param options {Objects}
     */
    Walls.prototype.setSize = function setSize(size, origin) {
        origin = origin || this.options.origin;
        if (origin.length < 3) origin[2] = 0.5;

        this.forEach(function(wall, side) {
            var d = _getDistance(side, size, origin);
            wall.setOptions({
                distance: d
            });
        });

        this.options.size = size;
        this.options.origin = origin;
    };

    function _setOptionsForEach(options) {
        this.forEach(function(wall) {
            wall.setOptions(options);
        });
        for (var key in options) this.options[key] = options[key];
    }

    /**
     * Adds an impulse to a physics body's velocity due to the walls constraint
     *
     * @method applyConstraint
     * @param targets {Array.Body}  Array of bodies to apply the constraint to
     * @param source {Body}         The source of the constraint
     * @param dt {Number}           Delta time
     */
    Walls.prototype.applyConstraint = function applyConstraint(targets, source, dt) {
        this.forEach(function(wall) {
            wall.applyConstraint(targets, source, dt);
        });
    };

    /**
     * Apply a method to each wall making up the walls
     *
     * @method applyConstraint
     * @param fn {Function}  Function that takes in a wall as its first parameter
     */
    Walls.prototype.forEach = function forEach(fn) {
        for (var key in this.sides) fn(this.sides[key], key);
    };

    /**
     * Rotates the walls by an angle in the XY-plane
     *
     * @method applyConstraint
     * @param angle {Function}
     */
    Walls.prototype.rotateZ = function rotateZ(angle) {
        this.forEach(function(wall) {
            var n = wall.options.normal;
            n.rotateZ(angle).put(n);
        });
    };

    /**
     * Rotates the walls by an angle in the YZ-plane
     *
     * @method applyConstraint
     * @param angle {Function}
     */
    Walls.prototype.rotateX = function rotateX(angle) {
        this.forEach(function(wall) {
            var n = wall.options.normal;
            n.rotateX(angle).put(n);
        });
    };

    /**
     * Rotates the walls by an angle in the XZ-plane
     *
     * @method applyConstraint
     * @param angle {Function}
     */
    Walls.prototype.rotateY = function rotateY(angle) {
        this.forEach(function(wall) {
            var n = wall.options.normal;
            n.rotateY(angle).put(n);
        });
    };

    module.exports = Walls;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

//TODO: test options manager
define('famous/physics/forces/Repulsion', ['require', 'exports', 'module', './Force', 'famous/math/Vector'], function(require, exports, module) {
    var Force = require('./Force');
    var Vector = require('famous/math/Vector');

    /**
     *  Repulsion is a force that repels (attracts) bodies away (towards)
     *    each other. A repulsion of negative strength is attractive.
     *
     *  @class Repulsion
     *  @constructor
     *  @extends Force
     *  @param {Object} options overwrites default options
     */
    function Repulsion(options) {
        this.options = Object.create(Repulsion.DEFAULT_OPTIONS);
        if (options) this.setOptions(options);

        //registers
        this.disp = new Vector();

        Force.call(this);
    }

    Repulsion.prototype = Object.create(Force.prototype);
    Repulsion.prototype.constructor = Repulsion;
    /**
     * @property Repulsion.DECAY_FUNCTIONS
     * @type Object
     * @protected
     * @static
     */
    Repulsion.DECAY_FUNCTIONS = {

        /**
         * A linear decay function
         * @attribute LINEAR
         * @type Function
         * @param {Number} r distance from the source body
         * @param {Number} cutoff the effective radius of influence
         */
        LINEAR: function(r, cutoff) {
            return Math.max(1 - (1 / cutoff) * r, 0);
        },

        /**
         * A Morse potential decay function (http://en.wikipedia.org/wiki/Morse_potential)
         * @attribute MORSE
         * @type Function
         * @param {Number} r distance from the source body
         * @param {Number} cutoff the minimum radius of influence
         */
        MORSE: function(r, cutoff) {
            var r0 = (cutoff === 0) ? 100 : cutoff;
            var rShifted = r + r0 * (1 - Math.log(2)); //shift by x-intercept
            return Math.max(1 - Math.pow(1 - Math.exp(rShifted / r0 - 1), 2), 0);
        },

        /**
         * An inverse distance decay function
         * @attribute INVERSE
         * @type Function
         * @param {Number} r distance from the source body
         * @param {Number} cutoff a distance shift to avoid singularities
         */
        INVERSE: function(r, cutoff) {
            return 1 / (1 - cutoff + r);
        },

        /**
         * An inverse squared distance decay function
         * @attribute INVERSE
         * @type Function
         * @param {Number} r distance from the source body
         * @param {Number} cutoff a distance shift to avoid singularities
         */
        GRAVITY: function(r, cutoff) {
            return 1 / (1 - cutoff + r * r);
        }
    };

    /**
     * @property Repulsion.DEFAULT_OPTIONS
     * @type Object
     * @protected
     * @static
     */
    Repulsion.DEFAULT_OPTIONS = {

        /**
         * The strength of the force
         *    Range : [0, 100]
         * @attribute strength
         * @type Number
         * @default 1
         */
        strength: 1,

        /**
         * The location of the force, if not another physics body
         *
         * @attribute anchor
         * @type Number
         * @default 0.01
         * @optional
         */
        anchor: undefined,

        /**
         * The range of the repulsive force
         * @attribute radii
         * @type Array
         * @default [0, Infinity]
         */
        range: [0, Infinity],

        /**
         * A normalization for the force to avoid singularities at the origin
         * @attribute cutoff
         * @type Number
         * @default 0
         */
        cutoff: 0,

        /**
         * The maximum magnitude of the force
         *    Range : [0, Infinity]
         * @attribute cap
         * @type Number
         * @default Infinity
         */
        cap: Infinity,

        /**
         * The type of decay the repulsive force should have
         * @attribute decayFunction
         * @type Function
         */
        decayFunction: Repulsion.DECAY_FUNCTIONS.GRAVITY
    };

    /*
     * Setter for options.
     *
     * @method setOptions
     * @param {Objects} options
     */
    Repulsion.prototype.setOptions = function setOptions(options) {
        if (options.anchor !== undefined) {
            if (options.anchor.position instanceof Vector) this.options.anchor = options.anchor.position;
            if (options.anchor instanceof Array) this.options.anchor = new Vector(options.anchor);
            delete options.anchor;
        }
        for (var key in options) this.options[key] = options[key];
    };

    /**
     * Adds a drag force to a physics body's force accumulator.
     *
     * @method applyForce
     * @param targets {Array.Body}  Array of bodies to apply force to
     * @param source {Body}         The source of the force
     */
    Repulsion.prototype.applyForce = function applyForce(targets, source) {
        var options = this.options;
        var force = this.force;
        var disp = this.disp;

        var strength = options.strength;
        var anchor = options.anchor || source.position;
        var cap = options.cap;
        var cutoff = options.cutoff;
        var rMin = options.range[0];
        var rMax = options.range[1];
        var decayFn = options.decayFunction;

        if (strength === 0) return;

        for (var index in targets) {
            var particle = targets[index];

            if (particle === source) continue;

            var m1 = particle.mass;
            var p1 = particle.position;

            disp.set(p1.sub(anchor));
            var r = disp.norm();

            if (r < rMax && r > rMin) {
                force.set(disp.normalize(strength * m1 * decayFn(r, cutoff)).cap(cap));
                particle.applyForce(force);
            }
        }

    };

    module.exports = Repulsion;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/physics/forces/RotationalDrag', ['require', 'exports', 'module', './Drag'], function(require, exports, module) {
    var Drag = require('./Drag');

    /**
     * Rotational drag is a force that opposes angular velocity.
     *   Attach it to a physics body to slow down its rotation.
     *
     * @class RotationalDrag
     * @constructor
     * @extends Force
     * @param {Object} options options to set on drag
     */
    function RotationalDrag(options) {
        Drag.call(this, options);
    }

    RotationalDrag.prototype = Object.create(Drag.prototype);
    RotationalDrag.prototype.constructor = RotationalDrag;

    RotationalDrag.DEFAULT_OPTIONS = Drag.DEFAULT_OPTIONS;
    RotationalDrag.FORCE_FUNCTIONS = Drag.FORCE_FUNCTIONS;

    /**
     * @property Repulsion.FORCE_FUNCTIONS
     * @type Object
     * @protected
     * @static
     */
    RotationalDrag.FORCE_FUNCTIONS = {

        /**
         * A drag force proprtional to the angular velocity
         * @attribute LINEAR
         * @type Function
         * @param {Vector} angularVelocity
         * @return {Vector} drag force
         */
        LINEAR: function(angularVelocity) {
            return angularVelocity;
        },

        /**
         * A drag force proprtional to the square of the angular velocity
         * @attribute QUADRATIC
         * @type Function
         * @param {Vector} angularVelocity
         * @return {Vector} drag force
         */
        QUADRATIC: function(angularVelocity) {
            return angularVelocity.mult(angularVelocity.norm());
        }
    };

    /**
     * Adds a rotational drag force to a physics body's torque accumulator.
     *
     * @method applyForce
     * @param targets {Array.Body} Array of bodies to apply drag force to.
     */
    RotationalDrag.prototype.applyForce = function applyForce(targets) {
        var strength = this.options.strength;
        var forceFunction = this.options.forceFunction;
        var force = this.force;

        //TODO: rotational drag as function of inertia
        for (var index = 0; index < targets.length; index++) {
            var particle = targets[index];
            forceFunction(particle.angularVelocity).mult(-100 * strength).put(force);
            particle.applyTorque(force);
        }
    };

    /*
     * Setter for options.
     *
     * @method setOptions
     * @param {Objects} options
     */
    RotationalDrag.prototype.setOptions = function setOptions(options) {
        for (var key in options) this.options[key] = options[key];
    };

    module.exports = RotationalDrag;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

//TODO: test inheritance
define('famous/physics/forces/RotationalSpring', ['require', 'exports', 'module', './Spring'], function(require, exports, module) {
    var Spring = require('./Spring');

    /**
     *  A force that rotates a physics body back to target Euler angles.
     *  Just as a spring translates a body to a particular X, Y, Z, location,
     *  a rotational spring rotates a body to a particular X, Y, Z Euler angle.
     *      Note: there is no physical agent that does this in the "real world"
     *
     *  @class RotationalSpring
     *  @constructor
     *  @extends Spring
     *  @param {Object} options options to set on drag
     */
    function RotationalSpring(options) {
        Spring.call(this, options);
    }

    RotationalSpring.prototype = Object.create(Spring.prototype);
    RotationalSpring.prototype.constructor = RotationalSpring;

    RotationalSpring.DEFAULT_OPTIONS = Spring.DEFAULT_OPTIONS;
    RotationalSpring.FORCE_FUNCTIONS = Spring.FORCE_FUNCTIONS;

    /**
     * Adds a torque force to a physics body's torque accumulator.
     *
     * @method applyForce
     * @param targets {Array.Body} Array of bodies to apply torque to.
     */
    RotationalSpring.prototype.applyForce = function applyForce(targets) {
        var force = this.force;
        var options = this.options;
        var disp = this.disp;

        var stiffness = options.stiffness;
        var damping = options.damping;
        var restLength = options.length;
        var anchor = options.anchor;

        for (var i = 0; i < targets.length; i++) {
            var target = targets[i];

            disp.set(anchor.sub(target.orientation));
            var dist = disp.norm() - restLength;

            if (dist === 0) return;

            //if dampingRatio specified, then override strength and damping
            var m = target.mass;
            stiffness *= m;
            damping *= m;

            force.set(disp.normalize(stiffness * this.forceFunction(dist, this.options.lMax)));

            if (damping) force.set(force.add(target.angularVelocity.mult(-damping)));

            target.applyTorque(force);
        }
    };

    /**
     * Calculates the potential energy of the rotational spring.
     *
     * @method getEnergy
     * @param {Body} target The physics body attached to the spring
     */
    RotationalSpring.prototype.getEnergy = function getEnergy(target) {
        var options = this.options;
        var restLength = options.length;
        var anchor = options.anchor;
        var strength = options.stiffness;

        var dist = anchor.sub(target.orientation).norm() - restLength;
        return 0.5 * strength * dist * dist;
    };

    module.exports = RotationalSpring;
});

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Owner: david@famo.us
 * @license MPL 2.0
 * @copyright Famous Industries, Inc. 2014
 */

define('famous/physics/forces/VectorField', ['require', 'exports', 'module', './Force', 'famous/math/Vector'], function(require, exports, module) {
    var Force = require('./Force');
    var Vector = require('famous/math/Vector');

    /**
     *  A force that moves a physics body to a location with a spring motion.
     *    The body can be moved to another physics body, or an anchor point.
     *
     *  @class VectorField
     *  @constructor
     *  @extends Force
     *  @param {Object} options options to set on drag
     */
    function VectorField(options) {
        this.options = Object.create(VectorField.DEFAULT_OPTIONS);
        if (options) this.setOptions(options);

        _setFieldOptions.call(this, this.options.field);
        Force.call(this);

        //registers
        this.evaluation = new Vector(0, 0, 0);
    }

    VectorField.prototype = Object.create(Force.prototype);
    VectorField.prototype.constructor = VectorField;

    /**
     * @property Spring.FORCE_FUNCTIONS
     * @type Object
     * @protected
     * @static
     */
    VectorField.FIELDS = {
        /**
         * Constant force, e.g., gravity
         * @attribute CONSTANT
         * @type Function
         * @param v {Vector}        Current position of physics body
         * @param options {Object}  The direction of the force
         *      Pass a {direction : Vector} into the VectorField options
         * @return {Number} unscaled force
         */
        CONSTANT: function(v, options) {
            return v.set(options.direction);
        },

        /**
         * Linear force
         * @attribute LINEAR
         * @type Function
         * @param v {Vector} Current position of physics body
         * @return {Number} unscaled force
         */
        LINEAR: function(v) {
            return v;
        },

        /**
         * Radial force, e.g., Hookean spring
         * @attribute RADIAL
         * @type Function
         * @param v {Vector} Current position of physics body
         * @return {Number} unscaled force
         */
        RADIAL: function(v) {
            return v.set(v.mult(-1, v));
        },

        /**
         * Spherical force
         * @attribute SPHERE_ATTRACTOR
         * @type Function
         * @param v {Vector}        Current position of physics body
         * @param options {Object}  An object with the radius of the sphere
         *      Pass a {radius : Number} into the VectorField options
         * @return {Number} unscaled force
         */
        SPHERE_ATTRACTOR: function(v, options) {
            return v.set(v.mult((options.radius - v.norm()) / v.norm()));
        },

        /**
         * Point attractor force, e.g., Hookean spring with an anchor
         * @attribute POINT_ATTRACTOR
         * @type Function
         * @param v {Vector}        Current position of physics body
         * @param options {Object}  And object with the position of the attractor
         *      Pass a {position : Vector} into the VectorField options
         * @return {Number} unscaled force
         */
        POINT_ATTRACTOR: function(v, options) {
            return v.set(options.position.sub(v));
        }
    };

    /**
     * @property VectorField.DEFAULT_OPTIONS
     * @type Object
     * @protected
     * @static
     */
    VectorField.DEFAULT_OPTIONS = {

        /**
         * The strength of the force
         *    Range : [0, 10]
         * @attribute strength
         * @type Number
         * @default 1
         */
        strength: 1,

        /**
         * Type of vectorfield
         *    Range : [0, 100]
         * @attribute field
         * @type Function
         */
        field: VectorField.FIELDS.CONSTANT
    };

    /**
     * Basic options setter
     *
     * @method setOptions
     * @param {Objects} options
     */
    VectorField.prototype.setOptions = function setOptions(options) {
        for (var key in options) this.options[key] = options[key];
    };

    function _setFieldOptions(field) {
        var FIELDS = VectorField.FIELDS;

        switch (field) {
            case FIELDS.CONSTANT:
                if (!this.options.direction) this.options.direction = new Vector(0, 1, 0);
                break;
            case FIELDS.POINT_ATTRACTOR:
                if (!this.options.position) this.options.position = new Vector(0, 0, 0);
                break;
            case FIELDS.SPHERE_ATTRACTOR:
                if (!this.options.radius) this.options.radius = 1;
                break;
        }
    }

    function _evaluate(v) {
        var evaluation = this.evaluation;
        var field = this.options.field;
        evaluation.set(v);
        return field(evaluation, this.options);
    }

    /**
     * Adds the vectorfield's force to a physics body's force accumulator.
     *
     * @method applyForce
     * @param targets {Array.body} Array of bodies to apply force to.
     */
    VectorField.prototype.applyForce = function applyForce(targets) {
        var force = this.force;
        for (var i = 0; i < targets.length; i++) {
            var particle = targets[i];
            force.set(
                _evaluate.call(this, particle.position)
                .mult(particle.mass * this.options.strength)
            );
            particle.applyForce(force);
        }
    };

    module.exports = VectorField;
});
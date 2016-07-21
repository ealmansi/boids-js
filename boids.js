(function() {

    /*
    *   Parameters.
    */

    // Refresh rate.
    var refreshRate = 60;                       // Number of times to refresh every second.
    var refreshInterval = 1000 / refreshRate;   // Number of milliseconds between refresh calls.
    var deltaTime = 1 / refreshRate;

    // Simulation parameters.
    var numberOfBoids = 200;                // Number of boids in simulation.
    var neighbourhoodRadius = 50;           // In pixels.
    var maxSpeed = 300;                     // In pixels per second.
    var maxAcceleration = 100;              // In pixels per second per second.
    var accelerationDecayFactor = 0.75;     // Factor between 0 and 1.

    // Rule weights.
    var rule1Weight = 0.34;
    var rule2Weight = 0.33;
    var rule3Weight = 0.33;

    // Boid display settings.
    var boidHeight = 10;
    var boidBase = 4;

    /*
    *   Model.
    */

    var boids = null; // List of Boid.

    function Boid(pos, vel, acc) {
        this.pos = pos; // Vector.
        this.vel = vel; // Vector.
        this.acc = acc; // Vector.
    }

    /*
    *   Vector.
    */

    function Vector(x, y) {
        this.x = x;
        this.y = y;
        this.length = Math.sqrt(x * x + y * y);
    }

    function saturate(vec, maxLength) {
        if (vec.length <= maxLength) {
            return vec;
        }
        return scale(vec, maxLength);
    }

    function scale(vec, length) {
        var scalingFactor = length / vec.length;
        return new Vector(vec.x * scalingFactor, vec.y * scalingFactor);
    }

    /*
    *   Canvas.
    */

    var canvas = null;
    var canvasWidth = null;
    var canvasHeight = null;
    var canvasContext = null;

    /*
    *   Neighbourhood table.
    */

    var neighbourhoodTable = null;
    var neighbourhoodTableWidth = null;
    var neighbourhoodTableHeight = null;

    /*
    *   Main.
    */

    function main() {
        setup();
        refresh();
        return setInterval(function() {
            update();
            refresh();
        }, refreshInterval);
    }

    /*
    *   Setup.
    */

    function setup() {
        setupCanvas();
        setupNeighbourhoodTable();
        setupModel();
    }

    function setupCanvas() {
        canvas = document.getElementById("boids-canvas");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvasWidth = canvas.width;
        canvasHeight = canvas.height;
        canvasContext = canvas.getContext("2d");
        // Styling.
        canvasContext.lineWidth = 1;
        canvasContext.strokeStyle = 'gray';
    }

    function setupNeighbourhoodTable() {
        neighbourhoodTableWidth = Math.ceil(canvasWidth / neighbourhoodRadius);
        neighbourhoodTableHeight = Math.ceil(canvasHeight / neighbourhoodRadius);
        neighbourhoodTable = new Array(neighbourhoodTableHeight);
        _.times(neighbourhoodTableHeight, function(i) {
            neighbourhoodTable[i] = new Array(neighbourhoodTableWidth);
        });
    }

    function setupModel() {
        boids = [];
        _.times(numberOfBoids, function() {
            var pos = getRandomPosition();
            var vel = getRandomVelocity();
            var acc = new Vector(0, 0);
            boids.push(new Boid(pos, vel, acc));
        });
    }

    function getRandomPosition() {
        var x = Math.random() * canvasWidth;
        var y = Math.random() * canvasHeight;
        return new Vector(x, y);
    }

    function getRandomVelocity() {
        var speed = maxSpeed / 5 * Math.sqrt(Math.random());
        var angle = 2 * Math.PI * Math.random();
        var vx = speed * Math.cos(angle);
        var vy = speed * Math.sin(angle);
        return new Vector(vx, vy);
    }

    /*
    *   Update.
    */

    function update() {
        updateNeighbourhoodTable();
        _.each(boids, updateBoid);
    }

    function updateNeighbourhoodTable() {
        clearNeighbourhoodTable();
        _.each(boids, function(boid) {
            var i = Math.floor(boid.pos.y / neighbourhoodRadius);
            var j = Math.floor(boid.pos.x / neighbourhoodRadius);
            neighbourhoodTable[i][j].push(boid);
        });
    }

    function clearNeighbourhoodTable() {
        _.times(neighbourhoodTableHeight, function(i) {
            _.times(neighbourhoodTableWidth, function(j) {
                neighbourhoodTable[i][j] = [];
            });
        });
    }

    function updateBoid(boid) {
        updateBoidPos(boid, boid.pos, boid.vel, boid.acc);
        updateBoidVel(boid, boid.pos, boid.vel, boid.acc);
        updateBoidAcc(boid, boid.pos, boid.vel, boid.acc);
    }

    function updateBoidPos(boid, pos, vel, acc) {
        var x = overflow(pos.x + vel.x * deltaTime, canvasWidth);
        var y = overflow(pos.y + vel.y * deltaTime, canvasHeight);
        boid.pos = new Vector(x, y);
    }

    function updateBoidVel(boid, pos, vel, acc) {
        var x = vel.x + acc.x * deltaTime;
        var y = vel.y + acc.y * deltaTime;
        boid.vel = saturate(new Vector(x, y), maxSpeed);
    }

    function updateBoidAcc(boid, pos, vel, acc) {
        var neighbours = getNeighbours(boid);
        var nx = 0.0;
        var ny = 0.0;
        if (neighbours.length > 0) {
            var accRule1 = calculateRule1(boid, neighbours);
            var accRule2 = calculateRule2(boid, neighbours);
            var accRule3 = calculateRule3(boid, neighbours);
            nx = accRule1.x * rule1Weight
                    + accRule2.x * rule2Weight
                    + accRule3.x * rule3Weight;
            ny = accRule1.y * rule1Weight
                    + accRule2.y * rule2Weight
                    + accRule3.y * rule3Weight;
        }
        var x = accelerationDecayFactor * boid.acc.x + (1 - accelerationDecayFactor) * nx;
        var y = accelerationDecayFactor * boid.acc.y + (1 - accelerationDecayFactor) * ny;
        boid.acc = saturate(new Vector(x, y), maxAcceleration);
    }

    function getNeighbours(boid) {
        var i = Math.floor(boid.pos.y / neighbourhoodRadius);
        var j = Math.floor(boid.pos.x / neighbourhoodRadius);
        var neighbours = [];
        _.times(3, function(ii) {
            _.times(3, function(jj) {
                var oi = overflow(i + ii - 1, neighbourhoodTableHeight);
                var oj = overflow(j + jj - 1, neighbourhoodTableWidth);
                _.each(neighbourhoodTable[oi][oj], function(otherBoid) {
                    if (boid != otherBoid && withinRadius(boid, otherBoid)) {
                        neighbours.push(otherBoid);
                    }
                });
            });
        });
        return neighbours;
    }

    function withinRadius(boid, otherBoid) {
        var mx = Math.min(boid.pos.x, otherBoid.pos.x);
        var Mx = Math.max(boid.pos.x, otherBoid.pos.x);
        var my = Math.min(boid.pos.y, otherBoid.pos.y);
        var My = Math.max(boid.pos.y, otherBoid.pos.y);
        var dx = Math.min(Mx - mx, mx + canvasWidth - Mx);
        var dy = Math.min(My - my, my + canvasHeight - My);
        return dx <= neighbourhoodRadius && dy <= neighbourhoodRadius;
    }

    function calculateRule1(boid, neighbours) {
        var cx = 0, cy = 0;
        _.each(neighbours, function(otherBoid) {
            cx += otherBoid.pos.x;
            cy += otherBoid.pos.y;
        });
        cx = cx / neighbours.length, cy = cy / neighbours.length;
        return new Vector((boid.pos.x - cx) / deltaTime / deltaTime, (boid.pos.y - cy) / deltaTime / deltaTime);
    }

    function calculateRule2(boid, neighbours) {
        var cx = 0, cy = 0;
        _.each(neighbours, function(otherBoid) {
            cx += otherBoid.vel.x;
            cy += otherBoid.vel.y;
        });
        cx = cx / neighbours.length, cy = cy / neighbours.length;
        return new Vector((cx - boid.vel.x) / deltaTime, (cy - boid.vel.y) / deltaTime);
    }

    function calculateRule3(boid, neighbours) {
        var cx = 0, cy = 0;
        _.each(neighbours, function(otherBoid) {
            cx += otherBoid.acc.x;
            cy += otherBoid.acc.y;
        });
        cx = cx / neighbours.length, cy = cy / neighbours.length;
        return new Vector((cx - boid.acc.x), (cy - boid.acc.y));
    }

    function overflow(value, range) {
        return ((value % range) + range) % range;
    }

    /*
    *   Refresh.
    */

    function refresh() {
        clearCanvas();
        _.each(boids, drawBoid);
    }

    function clearCanvas() {
        canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
    }

    function drawBoid(boid) {
        var x = boid.pos.x;
        var y = boid.pos.y;
        
        // Get scaled velocity vector.
        var scaledVelocity = scale(boid.vel, boidHeight);
        var sx = scaledVelocity.x;
        var sy = scaledVelocity.y;
        
        // Get scaled normal vector (w.r.t. velocity).
        var scaledNormal = scale(new Vector(-boid.vel.y, boid.vel.x), boidBase / 2);
        var nx = scaledNormal.x;
        var ny = scaledNormal.y;

        // Begin triangle.
        canvasContext.beginPath();

        // Draw left side.
        canvasContext.moveTo(x - nx, y - ny);
        canvasContext.lineTo(x + sx, y + sy);

        // Draw right side.
        canvasContext.moveTo(x + nx, y + ny);
        canvasContext.lineTo(x + sx, y + sy);

        // Draw bottom side.
        canvasContext.moveTo(x - nx, y - ny);
        canvasContext.lineTo(x + nx, y + ny);

        // Complete triangle and stroke.
        canvasContext.closePath();
        canvasContext.stroke();
    }

    /*
    *   On document ready.
    */

    $(document).ready(function() {
        var sliders = [
            { id: "number-of-boids-slider", default: 500 },
            { id: "neighbourhood-radius-slider", default: 50 },
            { id: "max-speed-slider", default: 300 },
            { id: "max-acceleration-slider", default: 100 },
            { id: "acceleration-decay-factor-slider", default: 0.75 },
            { id: "rule1-weight-slider", default: 8 },
            { id: "rule2-weight-slider", default: 6 },
            { id: "rule3-weight-slider", default: 1 },
            { id: "boid-height-slider", default: 10 },
            { id: "boid-base-slider", default: 4 }
        ];

        _.each(sliders, function(slider) {
            var sliderElement = $("#" + slider.id);
            sliderElement.slider();
            sliderElement.val(slider.default);
            sliderElement.change(onSliderChange);
        });

        function onSliderChange() {
            // Simulation parameters.
            numberOfBoids = $("#number-of-boids-slider").val();
            neighbourhoodRadius = $("#neighbourhood-radius-slider").val();
            maxSpeed = $("#max-speed-slider").val();
            maxAcceleration = $("#max-acceleration-slider").val();
            accelerationDecayFactor = $("#acceleration-decay-factor-slider").val();
            
            // Rule weights.
            var rule1SliderValue = +$("#rule1-weight-slider").val();
            var rule2SliderValue = +$("#rule2-weight-slider").val();
            var rule3SliderValue = +$("#rule3-weight-slider").val();
            rule1Weight = 1.0 * rule1SliderValue / (rule1SliderValue + rule2SliderValue + rule3SliderValue);
            rule2Weight = 1.0 * rule2SliderValue / (rule1SliderValue + rule2SliderValue + rule3SliderValue);
            rule3Weight = 1.0 * rule3SliderValue / (rule1SliderValue + rule2SliderValue + rule3SliderValue);
            
            // Boid display settings.
            boidHeight = $("#boid-height-slider").val();
            boidBase = $("#boid-base-slider").val();

            // Update slider displays.
            $("#number-of-boids-value").text(numberOfBoids);
            $("#neighbourhood-radius-value").text(neighbourhoodRadius);
            $("#max-speed-value").text(maxSpeed);
            $("#max-acceleration-value").text(maxAcceleration);
            $("#acceleration-decay-factor-value").text(accelerationDecayFactor);
            $("#rule1-weight-value").text(rule1Weight.toFixed(3));
            $("#rule2-weight-value").text(rule2Weight.toFixed(3));
            $("#rule3-weight-value").text(rule3Weight.toFixed(3));
            $("#boid-height-value").text(boidHeight);
            $("#boid-base-value").text(boidBase);

            runMain();
        }

        var intervalId = null;

        function runMain() {
            if (intervalId !== null) {
                clearInterval(intervalId);
            }
            intervalId = main();
        }

        onSliderChange();
    });

})();

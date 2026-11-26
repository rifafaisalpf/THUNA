
let simulationInterval = null;

let currentGesture = "IDLE";
let startTime = 0;

function generateSensorData() {

    const time = (Date.now() - startTime) / 1000;

    const noise = () => (Math.random() - 0.5) * 0.1;

    let ax = 0;
    let ay = 0;
    let az = 9.81;

    let gx = 0;
    let gy = 0;
    let gz = 0;

    // Generate YES movement
    if (currentGesture === "YES") {

        gx = 120 * Math.sin(2 * Math.PI * 1.5 * time);

    }

    // Generate NO movement
    else if (currentGesture === "NO") {

        gy = 120 * Math.sin(2 * Math.PI * 1.5 * time);

    }

    // Generate FOOD circular movement
    else if (currentGesture === "FOOD") {

        gx = 90 * Math.sin(2 * Math.PI * time);
        gy = 90 * Math.cos(2 * Math.PI * time);

    }

    const sensorData = {

        timestamp: Date.now(),

        accelerometer: {
            x: ax + noise(),
            y: ay + noise(),
            z: az + noise()
        },

        gyroscope: {
            x: gx + noise(),
            y: gy + noise(),
            z: gz + noise()
        }

    };

    return sensorData;
}

function startSimulation() {

    if (simulationInterval !== null) return;

    startTime = Date.now();

    simulationInterval = setInterval(() => {

        const data = generateSensorData();

        window.dispatchEvent(
            new CustomEvent("thuna:sensor-data", {
                detail: data
            })
        );

    }, 50);
}

function stopSimulation() {

    clearInterval(simulationInterval);
    simulationInterval = null;

}

function setGesture(gesture) {

    currentGesture = gesture;
    startTime = Date.now();

}

window.thunaSensorSimulator = {
    start: startSimulation,
    stop: stopSimulation,
    setGesture: setGesture
};

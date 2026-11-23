
function calculateGyroscopeMagnitude(gyroscope) {

    const gx = gyroscope.x;
    const gy = gyroscope.y;
    const gz = gyroscope.z;

    const magnitude = Math.sqrt(
        gx * gx +
        gy * gy +
        gz * gz
    );

    return magnitude;
}

window.addEventListener("thuna:sensor-data", (event) => {

    const sensorData = event.detail;

    const movement = calculateGyroscopeMagnitude(
        sensorData.gyroscope
    );

    console.log("Wrist movement:", movement.toFixed(2), "°/s");

});

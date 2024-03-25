const stats = {
    latency: {
        min: Number.MAX_SAFE_INTEGER,
        max: 0,
        averageDataPoints: [],
        average: NaN,
    },
};
const maxLatencyDataPoints = 14;
function a(stats, time) {
    const currentMessageLatency = Date.now() - time;
    if (currentMessageLatency > stats.latency.max) {
        stats.latency.max = currentMessageLatency;
    }
    if (currentMessageLatency < stats.latency.min) {
        stats.latency.min = currentMessageLatency;
    }
    stats.latency.averageDataPoints.push(currentMessageLatency);

    if (stats.latency.averageDataPoints.length > maxLatencyDataPoints) {
        // Remove the oldest so the averageDataPoints array stays a fixed size
        stats.latency.averageDataPoints.shift();
        stats.latency.average =
            stats.latency.averageDataPoints.reduce((acc, cur) => acc + cur, 0) /
            stats.latency.averageDataPoints.length;
        // Broadcast latency information
        console.log('jtest', stats.latency);
    }
}
setInterval(() => {
    a(stats, Date.now()-randomIntFromInterval(1,1000))
}, 100)
function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
  }
  
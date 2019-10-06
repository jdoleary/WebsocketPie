function log() {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  console.log(...arguments);
}

module.exports = log;

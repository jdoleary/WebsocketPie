function log() {
  if (process.env.verbose !== 'yes') {
    return;
  }
  console.log(...arguments);
}

module.exports = log;

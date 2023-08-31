function log() {
  if (process.env.quiet === 'yes') {
    return;
  }
  console.log('PieServer:',...arguments);
}

module.exports = log;

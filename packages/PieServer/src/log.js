function log() {
  if (process.env.quiet === 'yes') {
    return;
  }
  console.log('@websocketpie/server-bun:',...arguments);
}

module.exports = log;

const { name } = require("../package.json");
function log() {
  if (process.env.quiet === 'yes') {
    return;
  }
  console.log(name, ...arguments);
}

module.exports = log;

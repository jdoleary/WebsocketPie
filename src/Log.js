module.exports = function() {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  console.log(...arguments);
};

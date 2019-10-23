module.exports = {
  "hooks": {
    "pre-push": "cd $(git rev-parse --show-toplevel) && sh husky-prepush.sh"
  }
};
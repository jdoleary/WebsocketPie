module.exports =  {
  extends:  [
    'plugin:prettier/recommended',  // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  parserOptions:  {
    ecmaVersion:  2018,
  },
  plugins: ["filenames", "prettier"],
  rules: {
    // Prefer snake_case unless there is a default export.
    "filenames/match-regex": [2, "^[a-z_]+$", true],
    // If there is a default export, the filename must match it.
    "filenames/match-exported": 2
  }
};

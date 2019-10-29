const { get, isArray, fromPairs } = require('lodash');

function env(key, otherwise) {
  return get(process.env, key, otherwise);
}

function envArray(key, otherwise = [], separator = ',') {
  const value = env(key);
  return value ? value.split(separator) : otherwise;
}

function envBool(key, otherwise = false) {
  if (env(key) === undefined) return otherwise;
  return env(key) === 'true';
}

function envInt(key, otherwise = false) {
  if (env(key) === undefined) return otherwise;
  return Number(env(key));
}

function parseLabelsParam(arr) {
  return isArray(arr) && arr.length
    ? fromPairs(arr.map((l) => l.split(':'))) || {}
    : {};
}

module.exports = {
  env,
  envArray,
  envBool,
  envInt,
  parseLabelsParam,
};

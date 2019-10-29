const Cache = require('ttl-cache');

class Store {
  constructor({ cacheTTL }) {
    this.data = {};
    this.busy = false;
    this.cache = new Cache({ ttl: cacheTTL });
  }

  set(key, value, expire = false) {
    if (expire) {
      this.cache.set(key, value);
    } else {
      this.data[key] = value;
    }
  }

  get(key) {
    return this.cache.get(key) || this.data[key];
  }
}

module.exports = Store;

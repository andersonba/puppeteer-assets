class Store {
  constructor() {
    this.data = {};
    this.busy = false;
  }

  set(key, value) {
    this.data[key] = value;
  }

  get(key) {
    return this.data[key];
  }
}

module.exports = Store;

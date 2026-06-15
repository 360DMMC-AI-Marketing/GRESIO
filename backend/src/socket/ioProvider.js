let ioInstance = null;
let isReady = false;

module.exports = {
  setIO(io) {
    ioInstance = io;
    isReady = true;
  },
  getIO() {
    return ioInstance;
  },
  isReady() {
    return isReady;
  },
};

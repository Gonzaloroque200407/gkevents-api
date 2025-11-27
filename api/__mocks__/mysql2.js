module.exports = {
  createPool: () => ({
    query: jest.fn(() => [[], []]),
    execute: jest.fn(() => [[], []]),
    end: jest.fn(),
  }),
};

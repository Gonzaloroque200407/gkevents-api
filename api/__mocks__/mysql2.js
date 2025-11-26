module.exports = {
  createPool: () => ({
    query: jest.fn().mockResolvedValue([[]]),
  }),
};

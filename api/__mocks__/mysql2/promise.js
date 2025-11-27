module.exports = {
  createPool: jest.fn(() => ({
    query: jest.fn().mockResolvedValue([[]]),  // Nenhum usuário encontrado
    execute: jest.fn().mockResolvedValue([[]]),
    end: jest.fn()
  }))
};

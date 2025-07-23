export default {
  test: {
    environment: 'node',
    include: ['bare.test.js'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        minWorkers: 1,
        maxWorkers: 1
      }
    }
  }
};
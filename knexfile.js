const path = require('path');

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.resolve(__dirname, 'src', 'database', 'cantina.sqlite'),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.resolve(__dirname, 'src', 'database', 'migrations'),
    },
    seeds: {
      directory: path.resolve(__dirname, 'src', 'database', 'seeds'),
    },
    pool: {
      // SQLite não aplica FOREIGN KEY por padrão: precisamos ligar a cada conexão
      afterCreate: (conn, done) => conn.run('PRAGMA foreign_keys = ON', done),
    },
  },
};

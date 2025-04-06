import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import databaseConfig from '../../config/database.js'; // Import the config

// Force color output for chalk
chalk.level = 3; // 3 is full color support

// Get config for development environment
const env = process.env.NODE_ENV || 'development';
const config = databaseConfig[env];

if (!config) {
  console.error(chalk.red(`Database configuration for environment '${env}' not found in config/database.js`));
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsPath = path.resolve(__dirname, '../../db/migrations');

// Connect to database using config
const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: config.logging ? msg => console.log(chalk.gray(msg)) : false, // Use chalk for logging if enabled
  pool: config.pool
});

// Create migration instance
const umzug = new Umzug({
  migrations: {
    glob: path.join(migrationsPath, '*.js'),
    resolve: ({ name, path, context }) => {
      const migration = import(path);
      return {
        name,
        up: async (params) => (await migration).up(params.context),
        down: async (params) => (await migration).down(params.context)
      };
    }
  },
  context: { queryInterface: sequelize.getQueryInterface(), Sequelize: Sequelize },
  storage: new SequelizeStorage({ sequelize }),
  logger: console
});

async function runMigrations() {
  try {
    // Check connection
    await sequelize.authenticate();
    console.log(chalk.green('✓ Connected to database'));
    
    // Run pending migrations
    const pending = await umzug.pending();
    
    if (pending.length === 0) {
      console.log(chalk.yellow('No pending migrations.'));
      return;
    }
    
    console.log(chalk.blue(`Running ${pending.length} migrations...`));
    
    const migrations = await umzug.up();
    
    console.log(chalk.green(`✓ ${migrations.length} migrations executed successfully.`));
    migrations.forEach(migration => {
      console.log(chalk.green(`  - ${migration.name}`));
    });
  } catch (error) {
    console.error(chalk.red('Migration failed:'), error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// If this file is run directly, execute migrations
runMigrations();

export { runMigrations }; 
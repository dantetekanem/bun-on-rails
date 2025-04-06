import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsPath = path.resolve(__dirname, '../migrations');

// Connect to database
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/bunrails_dev', {
  logging: false
});

// Create migration instance
const umzug = new Umzug({
  migrations: {
    glob: path.join(migrationsPath, '*.js'),
    resolve: ({ name, path, context }) => {
      const migration = import(path);
      return {
        name,
        up: async () => migration.up(context),
        down: async () => migration.down(context)
      };
    }
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console
});

async function rollbackMigration() {
  try {
    // Check connection
    await sequelize.authenticate();
    console.log(chalk.green('✓ Connected to database'));
    
    // Check if there are any migrations to roll back
    const executed = await umzug.executed();
    
    if (executed.length === 0) {
      console.log(chalk.yellow('No migrations to roll back.'));
      return;
    }
    
    console.log(chalk.blue('Rolling back the most recent migration...'));
    
    const migration = await umzug.down();
    
    console.log(chalk.green(`✓ Migration ${migration.name} rolled back successfully.`));
  } catch (error) {
    console.error(chalk.red('Rollback failed:'), error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Roll back the most recent migration
rollbackMigration(); 
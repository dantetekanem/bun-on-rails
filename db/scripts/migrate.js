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

// Run migrations
runMigrations(); 
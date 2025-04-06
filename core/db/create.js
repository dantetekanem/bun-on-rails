import { execSync } from 'child_process';
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

const dbName = config.database;
const dbUser = config.username;
const dbPassword = config.password;
const dbHost = config.host;
const dbPort = config.port; // Use port from config

async function createDatabase() {
  try {
    console.log(chalk.blue(`Attempting to create database ${dbName} on ${dbHost}:${dbPort}...`));
    
    // Use psql with config values
    const createCommand = `PGPASSWORD=${dbPassword} psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -c "CREATE DATABASE ${dbName};"`;
    execSync(createCommand);
    
    console.log(chalk.green(`✓ Database ${dbName} created successfully.`));
    
    // Create test database as well (using test config)
    const testConfig = databaseConfig.test;
    if (testConfig) {
      const testDbName = testConfig.database;
      const testDbUser = testConfig.username;
      const testDbPassword = testConfig.password;
      const testDbHost = testConfig.host;
      const testDbPort = testConfig.port;
      console.log(chalk.blue(`Attempting to create test database ${testDbName} on ${testDbHost}:${testDbPort}...`));
      
      const createTestCommand = `PGPASSWORD=${testDbPassword} psql -h ${testDbHost} -p ${testDbPort} -U ${testDbUser} -c "CREATE DATABASE ${testDbName};"`;
      execSync(createTestCommand);
      
      console.log(chalk.green(`✓ Test database ${testDbName} created successfully.`));
    } else {
       console.log(chalk.yellow('Test database configuration not found, skipping creation.'));
    }

  } catch (error) {
    console.error(chalk.red('Database creation failed:'), error.message);
    
    if (error.message.includes('already exists')) {
      console.log(chalk.yellow('Database already exists. Skipping creation.'));
    } else {
      process.exit(1);
    }
  }
}

// If this file is run directly, execute the database creation
createDatabase();

export { createDatabase }; 
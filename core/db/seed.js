import { Sequelize } from 'sequelize';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedsPath = path.resolve(__dirname, '../../db/seeds');

// Connect to database
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/bunrails_dev', {
  logging: false
});

async function runSeeds() {
  try {
    // Check connection
    await sequelize.authenticate();
    console.log(chalk.green('✓ Connected to database'));
    
    // Check if seeds directory exists
    if (!fs.existsSync(seedsPath)) {
      fs.mkdirSync(seedsPath, { recursive: true });
      console.log(chalk.yellow(`Created seeds directory at ${seedsPath}`));
      console.log(chalk.yellow('No seed files found. Create seed files in the seeds directory.'));
      return;
    }
    
    // Get all seed files
    const seedFiles = fs.readdirSync(seedsPath)
      .filter(file => file.endsWith('.js'))
      .sort(); // Run in alphabetical order
    
    if (seedFiles.length === 0) {
      console.log(chalk.yellow('No seed files found. Create seed files in the seeds directory.'));
      return;
    }
    
    console.log(chalk.blue(`Running ${seedFiles.length} seed files...`));
    
    // Run each seed file
    for (const file of seedFiles) {
      const seedPath = path.join(seedsPath, file);
      console.log(chalk.blue(`Running seed: ${file}`));
      
      const seedModule = await import(seedPath);
      await seedModule.seed(sequelize);
      
      console.log(chalk.green(`✓ Seed ${file} executed successfully.`));
    }
    
    console.log(chalk.green('✓ All seeds executed successfully.'));
  } catch (error) {
    console.error(chalk.red('Seed execution failed:'), error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run seeds
if (import.meta.url === import.meta.main) {
  runSeeds();
}

export { runSeeds }; 
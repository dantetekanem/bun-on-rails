import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsPath = path.resolve(__dirname, '../../db/migrations');

// Ensure migrations directory exists
if (!fs.existsSync(migrationsPath)) {
  fs.mkdirSync(migrationsPath, { recursive: true });
}

// Get migration name from command line args
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(chalk.red('Error: Missing migration name'));
  console.log(chalk.yellow('Usage: bun run generate:migration <migration_name>'));
  process.exit(1);
}

const migrationName = args[0].toLowerCase().replace(/\s+/g, '_');

// Generate timestamp in YYYYMMDDHHMMSS format
const now = new Date();
const year = now.getFullYear();
const month = (now.getMonth() + 1).toString().padStart(2, '0');
const day = now.getDate().toString().padStart(2, '0');
const hours = now.getHours().toString().padStart(2, '0');
const minutes = now.getMinutes().toString().padStart(2, '0');
const seconds = now.getSeconds().toString().padStart(2, '0');
const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;

const fileName = `${timestamp}_${migrationName}.js`;
const filePath = path.join(migrationsPath, fileName);

// Migration template (Update signature to match context changes)
const template = `export const up = async ({ queryInterface, Sequelize }) => {
  // Add your migration code here
  // Example:
  // await queryInterface.createTable('users', {
  //   id: {
  //     allowNull: false,
  //     autoIncrement: true,
  //     primaryKey: true,
  //     type: Sequelize.INTEGER
  //   },
  //   name: {
  //     type: Sequelize.STRING,
  //     allowNull: false
  //   },
  //   email: {
  //     type: Sequelize.STRING,
  //     allowNull: false,
  //     unique: true
  //   },
  //   createdAt: {
  //     allowNull: false,
  //     type: Sequelize.DATE
  //   },
  //   updatedAt: {
  //     allowNull: false,
  //     type: Sequelize.DATE
  //   }
  // });
};

export const down = async ({ queryInterface, Sequelize }) => {
  // Undo your migration
  // Example:
  // await queryInterface.dropTable('users');
};
`;

// Create the migration file
fs.writeFileSync(filePath, template);

console.log(chalk.green(`✓ Created migration: ${fileName}`));
console.log(chalk.blue(`File location: ${filePath}`)); 
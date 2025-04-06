import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { ActiveRecord, $, registerModel } from '../core/ActiveRecord.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelsPath = path.resolve(__dirname, '../../models');
const migrationsPath = path.resolve(__dirname, '../../db/migrations');

// Ensure directories exist
if (!fs.existsSync(modelsPath)) {
  fs.mkdirSync(modelsPath, { recursive: true });
}
if (!fs.existsSync(migrationsPath)) {
  fs.mkdirSync(migrationsPath, { recursive: true });
}

// Get model name from command line args
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(chalk.red('Error: Missing model name'));
  console.log(chalk.yellow('Usage: bun run generate:model <ModelName> [field:type ...]'));
  process.exit(1);
}

const modelName = args[0];
const modelNameCapitalized = modelName.charAt(0).toUpperCase() + modelName.slice(1);
const modelFileName = `${modelNameCapitalized}.js`;
const modelFilePath = path.join(modelsPath, modelFileName);

// Parse fields
const fields = [];
for (let i = 1; i < args.length; i++) {
  const [fieldName, fieldType] = args[i].split(':');
  fields.push({ name: fieldName, type: fieldType || 'string' });
}

// Model template
const modelTemplate = `import { ActiveRecord } from '../core/ActiveRecord.js';

export default class ${modelNameCapitalized} extends ActiveRecord {
  // Add associations here
  // Example:
  // hasMany = () => [
  //   'comments',
  //   () => ['comments', { through: 'posts' }]
  // ];
  
  // belongsTo = () => [
  //   'user'
  // ];
  
  // Add validations here
  // Example:
  // validate = () => [
  //   ['title', { presence: true, length: { in: '5..100' } }]
  // ];
  
  // Add callbacks here
  // Example:
  // afterCommit = () => [
  //   ['do_something', { on: 'create' }]
  // ];
  
  // Add custom methods here
  // Example:
  // do_something() {
  //   console.log(\`${modelNameCapitalized} created: \${this.id}\`)
  // }
}`;

// Create the model file
fs.writeFileSync(modelFilePath, modelTemplate);
console.log(chalk.green(`✓ Created model: ${modelFileName}`));

// Generate migration for this model
const timestamp = new Date().toISOString().replace(/[-:.]/g, '').split('T')[0];
const migrationName = `${timestamp}_create_${modelName.toLowerCase()}s.js`;
const migrationFilePath = path.join(migrationsPath, migrationName);

// Build fields for migration
const fieldDefinitions = fields.map(field => {
  const typeMap = {
    'string': 'Sequelize.STRING',
    'text': 'Sequelize.TEXT',
    'integer': 'Sequelize.INTEGER',
    'float': 'Sequelize.FLOAT',
    'decimal': 'Sequelize.DECIMAL',
    'boolean': 'Sequelize.BOOLEAN',
    'date': 'Sequelize.DATE',
    'dateonly': 'Sequelize.DATEONLY',
    'json': 'Sequelize.JSON',
    'jsonb': 'Sequelize.JSONB'
  };
  
  const sequelizeType = typeMap[field.type.toLowerCase()] || 'Sequelize.STRING';
  
  return `    ${field.name}: {
      type: ${sequelizeType}
    }`;
}).join(',\n');

// Migration template
const migrationTemplate = `export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('${modelName.toLowerCase()}s', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER
    },
${fieldDefinitions ? fieldDefinitions + ',' : ''}
    createdAt: {
      allowNull: false,
      type: Sequelize.DATE
    },
    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE
    }
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.dropTable('${modelName.toLowerCase()}s');
};
`;

// Create the migration file
fs.writeFileSync(migrationFilePath, migrationTemplate);
console.log(chalk.green(`✓ Created migration: ${migrationName}`));

console.log(chalk.blue('\nNext steps:'));
console.log(chalk.yellow(`1. Edit the model in ${modelFilePath}`));
console.log(chalk.yellow(`2. Run migrations: bun run db:migrate`)); 
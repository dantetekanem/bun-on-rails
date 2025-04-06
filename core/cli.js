#!/usr/bin/env bun

import { Command } from 'commander';
import chalk from 'chalk';
import { runMigrations } from './db/migrate.js';
import { rollbackMigration } from './db/rollback.js';
import { createDatabase } from './db/create.js';
import { runSeeds } from './db/seed.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const program = new Command();

program
  .name('bun-rails')
  .description('CLI tool for Bun on Rails framework')
  .version('0.1.0');

// Database commands
program
  .command('db:create')
  .description('Create a new database')
  .action(async () => {
    console.log(chalk.blue('Creating database...'));
    await createDatabase();
  });

program
  .command('db:migrate')
  .description('Run database migrations')
  .action(async () => {
    console.log(chalk.blue('Running migrations...'));
    await runMigrations();
  });

program
  .command('db:rollback')
  .description('Rollback the most recent migration')
  .action(async () => {
    console.log(chalk.blue('Rolling back the most recent migration...'));
    await rollbackMigration();
  });

program
  .command('db:seed')
  .description('Seed the database with sample data')
  .action(async () => {
    console.log(chalk.blue('Seeding database...'));
    await runSeeds();
  });

// Generator commands
program
  .command('generate:model <name> [fields...]')
  .alias('g:model')
  .description('Generate a new model')
  .action((name, fields) => {
    console.log(chalk.blue(`Generating model: ${name}`));
    const args = [name, ...fields].map(arg => `"${arg}"`).join(' ');
    execSync(`bun run core/generators/model.js ${args}`, { stdio: 'inherit' });
  });

program
  .command('generate:controller <name> [actions...]')
  .alias('g:controller')
  .description('Generate a new controller')
  .action((name, actions) => {
    console.log(chalk.blue(`Generating controller: ${name}`));
    const args = [name, ...actions].map(arg => `"${arg}"`).join(' ');
    execSync(`bun run core/generators/controller.js ${args}`, { stdio: 'inherit' });
  });

program
  .command('generate:migration <name>')
  .alias('g:migration')
  .description('Generate a new migration')
  .action((name) => {
    console.log(chalk.blue(`Generating migration: ${name}`));
    execSync(`bun run core/generators/migration.js "${name}"`, { stdio: 'inherit' });
  });

// Server command
program
  .command('server')
  .alias('s')
  .description('Start the Bun on Rails server')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .action((options) => {
    console.log(chalk.blue(`Starting server on port ${options.port}...`));
    execSync(`PORT=${options.port} bun run index.js`, { stdio: 'inherit' });
  });

program.parse(process.argv);

// If no args, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 
# Bun on Rails

A convention-over-configuration framework for Bun, inspired by Ruby on Rails. This is a proof of concept trying to make it easy to run and define.

## Features

- **Convention Over Configuration**: Models are auto-loaded, routes can be inferred from file structure, controllers handle logic without explicit rendering calls, and database schema is introspected automatically.
- **Declarative API**: Everything defined inside the class body with minimal boilerplate. Models, controllers, validations, associations, and callbacks are declared directly using decorators.
- **Automatic Schema Introspection**: No field definitions needed in models - they are inferred from the database.
- **Migration System**: Rails-like database migrations for managing schema changes.
- **Built on Bun**: Leverages Bun's high-performance runtime and server capabilities.

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/bun-on-rails.git
cd bun-on-rails

# Install dependencies
bun install

# Create database (PostgreSQL required)
bun run db:create

# Run migrations
bun run db:migrate

# Seed the database with sample data
bun run db:seed

# Start the server
bun dev
```

## Project Structure

```
bun-on-rails/
├── core/                   # Framework core components
│   ├── ActiveRecord.js     # ORM implementation
│   ├── ApplicationController.js # Base controller
│   ├── Router.js           # Routing engine
│   ├── db/                 # Database utilities
│   │   ├── create.js       # Database creation script
│   │   ├── migrate.js      # Migration runner
│   │   ├── rollback.js     # Migration rollback
│   │   └── seed.js         # Seed data runner
│   └── generators/         # Code generators
│       ├── controller.js   # Controller generator
│       ├── migration.js    # Migration generator
│       └── model.js        # Model generator
├── config/
│   └── routes.js           # Route definitions
├── controllers/            # Application controllers
│   └── users_controller.js # Example controller
├── db/
│   ├── migrations/         # Database migrations
│   └── seeds/              # Seed data
├── models/                 # Application models
│   └── User.js             # Example model
├── views/                  # View templates
│   ├── layouts/
│   │   └── application.ejs # Default layout
│   └── users/
│       └── show.ejs        # Example view
└── index.js                # Application entry point
```
# Bun on Rails

A convention-over-configuration framework for Bun, inspired by Ruby on Rails.

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
│   │   └── application.eta # Default layout
│   └── users/
│       └── show.eta        # Example view
└── index.js                # Application entry point
```

## Usage

### Models

Models automatically introspect database schema and support associations, validations, and callbacks:

```javascript
import ActiveRecord from '../core/ActiveRecord.js';

export default class User extends ActiveRecord {
  @hasMany("posts")
  @hasMany("comments", { through: "posts" })
  @validate('name', { presence: true, length: [5, 10] })
  @afterCommit("create", "notifyUser")

  notifyUser() {
    console.log(`User created: ${this.name}`)
  }
}
```

### Controllers

Controllers handle request logic and automatically render views:

```javascript
import ApplicationController from '../core/ApplicationController.js';
import User from '../models/User.js';

export default class UsersController extends ApplicationController {
  async show() {
    this.user = await User.find(this.params.id);
    if (!this.user) return this.redirect('/users', { status: 404 });
    
    // No explicit return needed - will auto-render users/show.eta with user variable
  }
  
  async index() {
    this.users = await User.all();
    // Auto-renders users/index.eta with users variable
  }
}
```

### Routes

Routes are defined in `config/routes.js`:

```javascript
export default (router) => {
  router.root('home#index');
  router.resources('users');
  router.get('/about', 'home#about');
};
```

### Views

Views use the Eta templating engine with a syntax similar to EJS:

```html
<h1>User Profile</h1>

<% if (user) { %>
  <div class="user-card">
    <h2><%= user.name %></h2>
    <p><strong>Email:</strong> <%= user.email %></p>
  </div>
<% } else { %>
  <p>User not found.</p>
<% } %>
```

### Database Migrations

Create and run migrations with the built-in migration system:

```bash
# Generate a new migration
bun run generate:migration create_posts

# Run pending migrations
bun run db:migrate

# Roll back the last migration
bun run db:rollback
```

## Generators

Generate models, controllers, and migrations with the built-in generators:

```bash
# Generate a model with fields
bun run generate:model Post title:string body:text user_id:integer

# Generate a controller with actions
bun run generate:controller posts index show new create edit update destroy
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
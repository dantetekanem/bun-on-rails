import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const controllersPath = path.resolve(__dirname, '../../controllers');
const viewsPath = path.resolve(__dirname, '../../views');

// Ensure directories exist
if (!fs.existsSync(controllersPath)) {
  fs.mkdirSync(controllersPath, { recursive: true });
}

// Get controller name from command line args
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(chalk.red('Error: Missing controller name'));
  console.log(chalk.yellow('Usage: bun run generate:controller <ControllerName> [action1 action2 ...]'));
  process.exit(1);
}

// Parse controller name
let controllerName = args[0];
if (!controllerName.endsWith('_controller')) {
  controllerName = `${controllerName}_controller`;
}
const viewDirName = controllerName.replace('_controller', '');
const controllerFileName = `${controllerName}.js`;
const controllerFilePath = path.join(controllersPath, controllerFileName);

// Parse actions
const actions = args.slice(1);
if (actions.length === 0) {
  // Default actions if none specified
  actions.push('index', 'show');
}

// Create controller template
const actionMethods = actions.map(action => `
  async ${action}() {
    // Action logic here
    // Access to params, query, body, etc.
    // Example:
    // this.title = "${viewDirName} ${action}";
    // this.data = await YourModel.all();
    
    // Will automatically render views/${viewDirName}/${action}.eta
  }`).join('');

const controllerTemplate = `import ApplicationController from '../core/ApplicationController.js';

export default class ${capitalizeControllerName(controllerName)} extends ApplicationController {
  constructor() {
    super();
    // Set default properties here
    // Example:
    // this.title = "${capitalizeControllerName(controllerName).replace('Controller', '')}";
  }${actionMethods}
}`;

// Create the controller file
fs.writeFileSync(controllerFilePath, controllerTemplate);
console.log(chalk.green(`✓ Created controller: ${controllerFileName}`));

// Create view directory and view files
const viewDirPath = path.join(viewsPath, viewDirName);
if (!fs.existsSync(viewDirPath)) {
  fs.mkdirSync(viewDirPath, { recursive: true });
}

// Create view files for each action
actions.forEach(action => {
  const viewFilePath = path.join(viewDirPath, `${action}.eta`);
  
  // Simple view template based on the action
  let viewContent = '';
  
  if (action === 'index') {
    viewContent = `<h1>${capitalizeControllerName(controllerName).replace('Controller', '')} Index</h1>

<% if (${viewDirName} && ${viewDirName}.length > 0) { %>
  <ul>
    <% ${viewDirName}.forEach(item => { %>
      <li>
        <a href="/${viewDirName}/<%= item.id %>"><%= item.name || item.title || item.id %></a>
      </li>
    <% }) %>
  </ul>
<% } else { %>
  <p>No ${viewDirName} found.</p>
<% } %>

<p><a href="/${viewDirName}/new">Create New</a></p>`;
  } else if (action === 'show') {
    viewContent = `<h1>${capitalizeControllerName(controllerName).replace('Controller', '')} Details</h1>

<% if (item) { %>
  <div class="details">
    <p><strong>ID:</strong> <%= item.id %></p>
    <% Object.keys(item).forEach(key => { %>
      <% if (!['id', 'createdAt', 'updatedAt'].includes(key)) { %>
        <p><strong><%= key %>:</strong> <%= item[key] %></p>
      <% } %>
    <% }) %>
    <p><strong>Created:</strong> <%= item.createdAt %></p>
  </div>
  
  <div class="actions">
    <a href="/${viewDirName}/<%= item.id %>/edit">Edit</a>
    <a href="/${viewDirName}">Back to List</a>
  </div>
<% } else { %>
  <p>Item not found.</p>
  <a href="/${viewDirName}">Back to List</a>
<% } %>`;
  } else if (action === 'new') {
    viewContent = `<h1>New ${capitalizeControllerName(controllerName).replace('Controller', '').slice(0, -1)}</h1>

<form action="/${viewDirName}" method="post">
  <!-- Add form fields here -->
  
  <div class="form-group">
    <button type="submit">Create</button>
    <a href="/${viewDirName}">Cancel</a>
  </div>
</form>`;
  } else if (action === 'edit') {
    viewContent = `<h1>Edit ${capitalizeControllerName(controllerName).replace('Controller', '').slice(0, -1)}</h1>

<form action="/${viewDirName}/<%= item.id %>" method="post">
  <input type="hidden" name="_method" value="put">
  <!-- Add form fields here -->
  
  <div class="form-group">
    <button type="submit">Update</button>
    <a href="/${viewDirName}/<%= item.id %>">Cancel</a>
  </div>
</form>`;
  } else {
    viewContent = `<h1>${action} ${capitalizeControllerName(controllerName).replace('Controller', '')}</h1>

<p>This is the ${action} view for ${controllerName}.</p>

<p><a href="/${viewDirName}">Back to Index</a></p>`;
  }
  
  fs.writeFileSync(viewFilePath, viewContent);
  console.log(chalk.green(`✓ Created view: ${viewFilePath}`));
});

console.log(chalk.blue('\nNext steps:'));
console.log(chalk.yellow(`1. Edit the controller in ${controllerFilePath}`));
console.log(chalk.yellow(`2. Update views in ${viewDirPath}`));
console.log(chalk.yellow(`3. Add routes to config/routes.js`));

// Helper function to capitalize controller name properly
function capitalizeControllerName(name) {
  return name
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
} 
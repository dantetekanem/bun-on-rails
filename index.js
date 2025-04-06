import bootstrap from '#bun-on-rails/bootstrap.js';
import routes from '#config/routes.js';

const { start } = bootstrap(routes);
start();

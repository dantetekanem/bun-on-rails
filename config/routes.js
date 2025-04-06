import Router from '#bun-on-rails/Router.js';

// Initialize router
const router = new Router();

router.get('/', 'HomeController#index');
router.get('/users', 'UsersController#index');
router.get('/users/:id', 'UsersController#show');
router.get('/about', 'HomeController#about');

export default router;
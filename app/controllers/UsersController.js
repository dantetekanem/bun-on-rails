import ApplicationController from '#bun-on-rails/ApplicationController.js';
import User from '#app/models/User.js';

export default class UsersController extends ApplicationController {
  async index() {
    this.title = 'Users';
    this.users = await User.all();
  }

  async show({ id }) {
    this.title = 'User';
    this.user = await User.find(id);
    
    if (!this.user) {
      return { status: 404, message: 'User not found' };
    }
  }
}
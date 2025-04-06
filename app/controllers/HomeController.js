import ApplicationController from '../../core/ApplicationController.js';

export default class HomeController extends ApplicationController {
  index() {
    this.title = 'Bun on Rails';
  }
  
  about() {
    this.title = 'About - Bun on Rails';
  }
} 
import { ActiveRecord } from '#bun-on-rails/ActiveRecord.js';

export default class User extends ActiveRecord {
  hasMany = () => [
    'posts',
    () => ['comments', { through: 'posts' }]
  ];

  validate = () => [
    ['name', { presence: true, length: { in: '5..10' } }]
  ];

  afterCommit = () => [
    ['notify_user', { on: 'create' }]
  ];

  notify_user() {
    console.log(`User created: ${this.name}`);
  }
}

export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('comments', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    user_id: { // Foreign key to users
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users', 
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE' 
    },
    post_id: { // Foreign key to posts
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'posts', 
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    created_at: {
      allowNull: false,
      type: Sequelize.DATE
    },
    updated_at: {
      allowNull: false,
      type: Sequelize.DATE
    }
  });
};

export const down = async ({ queryInterface, Sequelize }) => {
  await queryInterface.dropTable('comments');
};

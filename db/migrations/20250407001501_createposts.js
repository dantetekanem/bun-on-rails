export const up = async ({ queryInterface, Sequelize }) => {
  await queryInterface.createTable('posts', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false
    },
    message: {
      type: Sequelize.TEXT, // Use TEXT for potentially longer messages
      allowNull: true
    },
    user_id: { // Foreign key
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users', // References the users table
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE' // Or 'SET NULL' or 'RESTRICT' depending on desired behavior
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
  await queryInterface.dropTable('posts');
};

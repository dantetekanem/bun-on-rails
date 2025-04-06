export const seed = async (sequelize) => {
  const queryInterface = sequelize.getQueryInterface();
  
  // Clear existing data
  await queryInterface.bulkDelete('users', null, { truncate: true, cascade: true });
  
  // Insert seed data
  await queryInterface.bulkInsert('users', [
    {
      name: 'Admin User',
      email: 'admin@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);
  
  console.log('✓ Users seeded successfully');
}; 
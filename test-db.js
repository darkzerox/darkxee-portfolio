import DatabaseService from './src/services/DatabaseService.js';

const db = new DatabaseService();
try {
  db.init();
  console.log('Database initialized successfully');
  
  // Test inserting a sample portfolio item
  const samplePortfolio = {
    name: 'Test Project',
    img: 'test.jpg',
    site: 'https://test.com',
    date: '2024',
    category: 'Test',
    description: 'Test description'
  };
  
  const result = db.insertPortfolioItem(samplePortfolio);
  console.log('Inserted portfolio item:', result);
  
  // Test getting portfolio items
  const items = db.getPortfolioItems();
  console.log('Portfolio items:', items);
  
  // Test inserting a sample skill
  const sampleSkill = {
    name: 'Test Skill',
    power: 85,
    category: 'test'
  };
  
  const skillResult = db.insertSkill(sampleSkill);
  console.log('Inserted skill:', skillResult);
  
  // Test getting skills
  const skills = db.getSkills();
  console.log('Skills:', skills);
  
  // Get stats
  const stats = db.getStats();
  console.log('Database stats:', stats);
  
} catch (error) {
  console.error('Database test failed:', error);
} finally {
  db.close();
}
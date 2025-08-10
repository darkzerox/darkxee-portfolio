import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../server.js';
import MongoDBService from '../src/services/MongoDBService.js';
import databaseConnection from '../src/config/database.js';

describe('API Integration Tests', () => {
  let mongoServer;
  let dbService;
  let testDbUrl;

  // Test data
  const samplePortfolioItems = [
    {
      name: 'E-commerce Website',
      img: 'ecommerce.jpg',
      site: 'https://example.com',
      date: '2023',
      category: 'Ecommerce',
      description: 'A modern e-commerce platform'
    },
    {
      name: 'Portfolio Website',
      img: 'portfolio.jpg',
      site: 'https://portfolio.com',
      date: '2022',
      category: 'Profile',
      description: 'Personal portfolio website'
    },
    {
      name: 'Blog Platform',
      img: 'blog.jpg',
      site: null,
      date: '2024',
      category: 'Blog',
      description: 'Content management system'
    }
  ];

  const sampleSkills = [
    {
      name: 'JavaScript',
      power: 85,
      category: 'frontend'
    },
    {
      name: 'Node.js',
      power: 90,
      category: 'backend'
    },
    {
      name: 'MongoDB',
      power: 75,
      category: 'database'
    },
    {
      name: 'React',
      power: 80,
      category: 'frontend'
    }
  ];

  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    testDbUrl = mongoServer.getUri();
    
    // Set test database URL
    process.env.DATABASE_URL = testDbUrl;
    
    // Initialize database service
    dbService = new MongoDBService(testDbUrl);
    await dbService.init();
    
    // Override the database connection for testing
    databaseConnection.connect = jest.fn().mockResolvedValue(dbService);
    databaseConnection.disconnect = jest.fn().mockResolvedValue();
    databaseConnection.getConnectionInfo = jest.fn().mockResolvedValue({
      connected: true,
      initialized: true,
      healthMonitoring: true
    });
  });

  afterAll(async () => {
    // Clean up
    if (dbService) {
      await dbService.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    // Clear collections before each test
    await dbService.clearPortfolioTable();
    await dbService.clearSkillsTable();
  });

  describe('Health Check Endpoint', () => {
    it('should return healthy status when database is connected', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        database: {
          status: 'healthy'
        },
        connection: {
          connected: true,
          initialized: true,
          healthMonitoring: true
        }
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Portfolio API Endpoints', () => {
    beforeEach(async () => {
      // Insert test data
      for (const item of samplePortfolioItems) {
        await dbService.insertPortfolioItem(item);
      }
    });

    describe('GET /api/portfolio', () => {
      it('should return all portfolio items with correct structure', async () => {
        const response = await request(app)
          .get('/api/portfolio')
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          count: 3,
          total: 3,
          pagination: {
            offset: 0,
            limit: 3,
            hasMore: false
          }
        });

        expect(response.body.data).toHaveLength(3);
        expect(response.body.data[0]).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          img: expect.any(String),
          date: expect.any(String),
          category: expect.any(String),
          created_at: expect.any(String),
          updated_at: expect.any(String)
        });
      });

      it('should return items sorted by date descending', async () => {
        const response = await request(app)
          .get('/api/portfolio')
          .expect(200);

        const dates = response.body.data.map(item => item.date);
        expect(dates).toEqual(['2024', '2023', '2022']);
      });

      it('should filter portfolio items by category', async () => {
        const response = await request(app)
          .get('/api/portfolio?category=Ecommerce')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].category).toBe('Ecommerce');
        expect(response.body.data[0].name).toBe('E-commerce Website');
      });

      it('should return all items when category is "All"', async () => {
        const response = await request(app)
          .get('/api/portfolio?category=All')
          .expect(200);

        expect(response.body.data).toHaveLength(3);
      });

      it('should handle pagination with limit parameter', async () => {
        const response = await request(app)
          .get('/api/portfolio?limit=2')
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          count: 2,
          total: 3,
          pagination: {
            offset: 0,
            limit: 2,
            hasMore: true
          }
        });
        expect(response.body.data).toHaveLength(2);
      });

      it('should handle pagination with offset parameter', async () => {
        const response = await request(app)
          .get('/api/portfolio?offset=1')
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          count: 2,
          total: 3,
          pagination: {
            offset: 1,
            limit: 2,
            hasMore: false
          }
        });
        expect(response.body.data).toHaveLength(2);
      });

      it('should handle pagination with both limit and offset', async () => {
        const response = await request(app)
          .get('/api/portfolio?limit=1&offset=1')
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          count: 1,
          total: 3,
          pagination: {
            offset: 1,
            limit: 1,
            hasMore: true
          }
        });
        expect(response.body.data).toHaveLength(1);
      });

      it('should return 400 for invalid limit parameter', async () => {
        const response = await request(app)
          .get('/api/portfolio?limit=invalid')
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error: 'Limit must be a number between 1 and 100'
        });
      });

      it('should return 400 for limit exceeding maximum', async () => {
        const response = await request(app)
          .get('/api/portfolio?limit=101')
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error: 'Limit must be a number between 1 and 100'
        });
      });

      it('should return 400 for negative offset', async () => {
        const response = await request(app)
          .get('/api/portfolio?offset=-1')
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error: 'Offset must be a non-negative number'
        });
      });

      it('should return empty array when no items match category filter', async () => {
        const response = await request(app)
          .get('/api/portfolio?category=NonExistent')
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: [],
          count: 0,
          total: 0
        });
      });

      it('should handle category filtering with pagination', async () => {
        // Add more items in same category
        await dbService.insertPortfolioItem({
          name: 'Another Ecommerce Site',
          img: 'ecommerce2.jpg',
          site: 'https://example2.com',
          date: '2021',
          category: 'Ecommerce',
          description: 'Another e-commerce platform'
        });

        const response = await request(app)
          .get('/api/portfolio?category=Ecommerce&limit=1')
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          count: 1,
          total: 2,
          pagination: {
            offset: 0,
            limit: 1,
            hasMore: true
          }
        });
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].category).toBe('Ecommerce');
      });
    });

    describe('GET /api/portfolio/:id', () => {
      let portfolioId;

      beforeEach(async () => {
        const items = await dbService.getAllPortfolioItems();
        portfolioId = items[0].id;
      });

      it('should return a specific portfolio item by MongoDB ObjectId', async () => {
        const response = await request(app)
          .get(`/api/portfolio/${portfolioId}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            id: portfolioId,
            name: expect.any(String),
            img: expect.any(String),
            date: expect.any(String),
            category: expect.any(String),
            created_at: expect.any(String),
            updated_at: expect.any(String)
          }
        });
      });

      it('should return 404 when portfolio item is not found', async () => {
        const nonExistentId = '507f1f77bcf86cd799439011'; // Valid ObjectId format

        const response = await request(app)
          .get(`/api/portfolio/${nonExistentId}`)
          .expect(404);

        expect(response.body).toEqual({
          success: false,
          error: 'Portfolio item not found',
          id: nonExistentId
        });
      });

      it('should return 400 for empty ID parameter', async () => {
        const response = await request(app)
          .get('/api/portfolio/ ')
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: 'Portfolio item ID is required'
        });
      });

      it('should handle invalid ObjectId format gracefully', async () => {
        const response = await request(app)
          .get('/api/portfolio/invalid-id')
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: 'Invalid portfolio item ID format'
        });
      });
    });
  });

  describe('Skills API Endpoints', () => {
    beforeEach(async () => {
      // Insert test data
      for (const skill of sampleSkills) {
        await dbService.insertSkill(skill);
      }
    });

    describe('GET /api/skills', () => {
      it('should return all skills with correct structure', async () => {
        const response = await request(app)
          .get('/api/skills')
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          count: 4
        });

        expect(response.body.data).toHaveLength(4);
        expect(response.body.data[0]).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          power: expect.any(Number),
          category: expect.any(String),
          created_at: expect.any(String),
          updated_at: expect.any(String)
        });
      });

      it('should return skills sorted by category then power descending', async () => {
        const response = await request(app)
          .get('/api/skills')
          .expect(200);

        // Check that skills are grouped by category
        const categories = response.body.data.map(skill => skill.category);
        const uniqueCategories = [...new Set(categories)];
        
        // Verify categories are in order
        expect(uniqueCategories).toEqual(['backend', 'database', 'frontend']);
        
        // Check that within frontend category, skills are sorted by power descending
        const frontendSkills = response.body.data.filter(skill => skill.category === 'frontend');
        const frontendPowers = frontendSkills.map(skill => skill.power);
        expect(frontendPowers).toEqual([85, 80]); // JavaScript (85), React (80)
      });

      it('should filter skills by category', async () => {
        const response = await request(app)
          .get('/api/skills?category=frontend')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data.every(skill => skill.category === 'frontend')).toBe(true);
        
        // Check that they're sorted by power descending
        const powers = response.body.data.map(skill => skill.power);
        expect(powers).toEqual([85, 80]);
      });

      it('should return empty array when no skills match category filter', async () => {
        const response = await request(app)
          .get('/api/skills?category=nonexistent')
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: [],
          count: 0
        });
      });

      it('should validate skill power ranges in returned data', async () => {
        const response = await request(app)
          .get('/api/skills')
          .expect(200);

        response.body.data.forEach(skill => {
          expect(skill.power).toBeGreaterThanOrEqual(0);
          expect(skill.power).toBeLessThanOrEqual(100);
          expect(Number.isInteger(skill.power)).toBe(true);
        });
      });
    });
  });

  describe('Data Persistence and Retrieval Accuracy', () => {
    it('should persist portfolio data accurately across requests', async () => {
      // Insert a portfolio item
      const testItem = {
        name: 'Test Project',
        img: 'test.jpg',
        site: 'https://test.com',
        date: '2023',
        category: 'Profile',
        description: 'Test description'
      };

      await dbService.insertPortfolioItem(testItem);

      // Retrieve via API
      const response = await request(app)
        .get('/api/portfolio')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      const retrievedItem = response.body.data[0];
      
      expect(retrievedItem).toMatchObject({
        name: testItem.name,
        img: testItem.img,
        site: testItem.site,
        date: testItem.date,
        category: testItem.category,
        description: testItem.description
      });
    });

    it('should persist skills data accurately across requests', async () => {
      // Insert a skill
      const testSkill = {
        name: 'Test Skill',
        power: 95,
        category: 'testing'
      };

      await dbService.insertSkill(testSkill);

      // Retrieve via API
      const response = await request(app)
        .get('/api/skills')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      const retrievedSkill = response.body.data[0];
      
      expect(retrievedSkill).toMatchObject({
        name: testSkill.name,
        power: testSkill.power,
        category: testSkill.category
      });
    });

    it('should maintain data integrity after multiple operations', async () => {
      // Insert multiple items
      for (const item of samplePortfolioItems) {
        await dbService.insertPortfolioItem(item);
      }

      // Verify count
      let response = await request(app)
        .get('/api/portfolio')
        .expect(200);
      expect(response.body.data).toHaveLength(3);

      // Filter by category
      response = await request(app)
        .get('/api/portfolio?category=Ecommerce')
        .expect(200);
      expect(response.body.data).toHaveLength(1);

      // Verify original data is still intact
      response = await request(app)
        .get('/api/portfolio')
        .expect(200);
      expect(response.body.data).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Simulate database disconnection
      await dbService.close();

      const response = await request(app)
        .get('/api/portfolio')
        .expect(503);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Database connection unavailable'
      });

      // Reconnect for cleanup
      await dbService.init();
    });

    it('should return 404 for non-existent API endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        error: 'API endpoint not found'
      });
    });

    it('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .get('/api/portfolio?limit=abc&offset=xyz')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Limit must be a number');
    });
  });

  describe('MongoDB-Specific Functionality', () => {
    it('should handle ObjectId conversion correctly', async () => {
      // Insert item and get its ObjectId
      await dbService.insertPortfolioItem(samplePortfolioItems[0]);
      const items = await dbService.getAllPortfolioItems();
      const objectId = items[0].id;

      // Verify ObjectId format
      expect(objectId).toMatch(/^[0-9a-fA-F]{24}$/);

      // Retrieve by ObjectId
      const response = await request(app)
        .get(`/api/portfolio/${objectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(objectId);
    });

    it('should handle MongoDB-specific error types', async () => {
      // Test with invalid ObjectId
      const response = await request(app)
        .get('/api/portfolio/invalid-object-id')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid portfolio item ID format'
      });
    });

    it('should maintain proper timestamps', async () => {
      await dbService.insertPortfolioItem(samplePortfolioItems[0]);

      const response = await request(app)
        .get('/api/portfolio')
        .expect(200);

      const item = response.body.data[0];
      expect(new Date(item.created_at)).toBeInstanceOf(Date);
      expect(new Date(item.updated_at)).toBeInstanceOf(Date);
      expect(item.created_at).toBe(item.updated_at); // Should be equal for new items
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      // Insert many items
      const manyItems = Array.from({ length: 50 }, (_, i) => ({
        name: `Project ${i}`,
        img: `project${i}.jpg`,
        site: `https://project${i}.com`,
        date: `202${i % 4}`,
        category: ['Profile', 'Blog', 'Ecommerce'][i % 3],
        description: `Description for project ${i}`
      }));

      for (const item of manyItems) {
        await dbService.insertPortfolioItem(item);
      }

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/portfolio')
        .expect(200);
      const endTime = Date.now();

      expect(response.body.data).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle pagination efficiently with large datasets', async () => {
      // Insert many items
      const manyItems = Array.from({ length: 100 }, (_, i) => ({
        name: `Project ${i}`,
        img: `project${i}.jpg`,
        site: `https://project${i}.com`,
        date: `202${i % 4}`,
        category: 'Profile',
        description: `Description for project ${i}`
      }));

      for (const item of manyItems) {
        await dbService.insertPortfolioItem(item);
      }

      // Test pagination performance
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/portfolio?limit=10&offset=50')
        .expect(200);
      const endTime = Date.now();

      expect(response.body.data).toHaveLength(10);
      expect(response.body.total).toBe(100);
      expect(response.body.pagination.hasMore).toBe(true);
      expect(endTime - startTime).toBeLessThan(500); // Should be fast even with pagination
    });
  });
});
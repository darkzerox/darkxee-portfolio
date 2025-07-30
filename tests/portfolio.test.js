import request from 'supertest';
import express from 'express';
import portfolioRoutes from '../src/routes/portfolio.js';

// Mock DatabaseService
const mockDbService = {
  getAllPortfolioItems: jest.fn(),
  getPortfolioItemsByCategory: jest.fn(),
  getPortfolioItemById: jest.fn()
};

// Sample test data
const samplePortfolioItems = [
  {
    id: 1,
    name: 'E-commerce Website',
    img: 'ecommerce.jpg',
    site: 'https://example.com',
    date: '2023-01-15',
    category: 'Ecommerce',
    description: 'A modern e-commerce platform'
  },
  {
    id: 2,
    name: 'Portfolio Website',
    img: 'portfolio.jpg',
    site: 'https://portfolio.com',
    date: '2023-02-20',
    category: 'Profile',
    description: 'Personal portfolio website'
  },
  {
    id: 3,
    name: 'Blog Platform',
    img: 'blog.jpg',
    site: null,
    date: '2023-03-10',
    category: 'Blog',
    description: 'Content management system'
  }
];

// Setup test app
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.dbService = mockDbService;
  next();
});
app.use('/api/portfolio', portfolioRoutes);

describe('Portfolio API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/portfolio', () => {
    it('should return all portfolio items when no category filter is provided', async () => {
      mockDbService.getAllPortfolioItems.mockReturnValue(samplePortfolioItems);

      const response = await request(app)
        .get('/api/portfolio')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: samplePortfolioItems,
        count: 3,
        total: 3,
        pagination: {
          offset: 0,
          limit: 3,
          hasMore: false
        }
      });
      expect(mockDbService.getAllPortfolioItems).toHaveBeenCalledTimes(1);
    });

    it('should return filtered portfolio items when category is provided', async () => {
      const ecommerceItems = [samplePortfolioItems[0]];
      mockDbService.getPortfolioItemsByCategory.mockReturnValue(ecommerceItems);

      const response = await request(app)
        .get('/api/portfolio?category=Ecommerce')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: ecommerceItems,
        count: 1,
        total: 1,
        pagination: {
          offset: 0,
          limit: 1,
          hasMore: false
        }
      });
      expect(mockDbService.getPortfolioItemsByCategory).toHaveBeenCalledWith('Ecommerce');
    });

    it('should return all items when category is "All"', async () => {
      mockDbService.getAllPortfolioItems.mockReturnValue(samplePortfolioItems);

      const response = await request(app)
        .get('/api/portfolio?category=All')
        .expect(200);

      expect(response.body.data).toEqual(samplePortfolioItems);
      expect(mockDbService.getAllPortfolioItems).toHaveBeenCalledTimes(1);
    });

    it('should handle pagination with limit and offset', async () => {
      mockDbService.getAllPortfolioItems.mockReturnValue(samplePortfolioItems);

      const response = await request(app)
        .get('/api/portfolio?limit=2&offset=1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: samplePortfolioItems.slice(1, 3),
        count: 2,
        total: 3,
        pagination: {
          offset: 1,
          limit: 2,
          hasMore: false
        }
      });
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

    it('should return 400 for invalid offset parameter', async () => {
      const response = await request(app)
        .get('/api/portfolio?offset=-1')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Offset must be a non-negative number'
      });
    });

    it('should handle database errors gracefully', async () => {
      mockDbService.getAllPortfolioItems.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/api/portfolio')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch portfolio items');
    });
  });

  describe('GET /api/portfolio/:id', () => {
    it('should return a specific portfolio item by ID', async () => {
      const portfolioItem = samplePortfolioItems[0];
      mockDbService.getPortfolioItemById.mockReturnValue(portfolioItem);

      const response = await request(app)
        .get('/api/portfolio/1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: portfolioItem
      });
      expect(mockDbService.getPortfolioItemById).toHaveBeenCalledWith(1);
    });

    it('should return 404 when portfolio item is not found', async () => {
      mockDbService.getPortfolioItemById.mockReturnValue(null);

      const response = await request(app)
        .get('/api/portfolio/999')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Portfolio item not found',
        id: 999
      });
    });

    it('should return 400 for invalid ID parameter', async () => {
      const response = await request(app)
        .get('/api/portfolio/invalid')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid portfolio item ID. ID must be a positive integer.'
      });
    });

    it('should return 400 for negative ID', async () => {
      const response = await request(app)
        .get('/api/portfolio/-1')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid portfolio item ID. ID must be a positive integer.'
      });
    });

    it('should handle database errors gracefully', async () => {
      mockDbService.getPortfolioItemById.mockImplementation(() => {
        throw new Error('Database query failed');
      });

      const response = await request(app)
        .get('/api/portfolio/1')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch portfolio item');
    });
  });
});
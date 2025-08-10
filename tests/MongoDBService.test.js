import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'

// Mock MongoDB before importing MongoDBService
const mockCollection = {
  insertOne: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  deleteMany: jest.fn(),
  countDocuments: jest.fn(),
  createIndex: jest.fn(),
  stats: jest.fn()
}

const mockDb = {
  collection: jest.fn(() => mockCollection),
  admin: jest.fn(() => ({
    ping: jest.fn(),
    serverStatus: jest.fn(() => ({
      version: '6.0.0',
      uptime: 12345,
      connections: { current: 5, available: 995 }
    }))
  })),
  dropDatabase: jest.fn(),
  command: jest.fn(),
  databaseName: 'test-portfolio'
}

const mockClient = {
  connect: jest.fn(),
  close: jest.fn(),
  db: jest.fn(() => mockDb),
  topology: {
    isConnected: jest.fn(() => true)
  }
}

// Mock the mongodb module
jest.mock('mongodb', () => ({
  MongoClient: jest.fn(() => mockClient),
  ObjectId: jest.fn((id) => ({ toString: () => id || 'mock-object-id' }))
}))

import MongoDBService from '../src/services/MongoDBService.js'

describe('MongoDBService', () => {
  let mongoService
  const mockConnectionString = 'mongodb://localhost:27017/test-portfolio'

  beforeEach(() => {
    jest.clearAllMocks()
    mongoService = new MongoDBService(mockConnectionString)
    
    // Reset mock implementations
    mockCollection.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([])
    })
  })

  afterEach(async () => {
    if (mongoService) {
      await mongoService.close()
    }
  })

  describe('Constructor and Initialization', () => {
    it('should initialize with connection string', () => {
      expect(mongoService.connectionString).toBe(mockConnectionString)
      expect(mongoService.client).toBeNull()
      expect(mongoService.db).toBeNull()
      expect(mongoService.isConnectedFlag).toBe(false)
    })

    it('should use environment variable if no connection string provided', () => {
      process.env.DATABASE_URL = 'mongodb://env-test:27017/env-db'
      const service = new MongoDBService()
      expect(service.connectionString).toBe('mongodb://env-test:27017/env-db')
      delete process.env.DATABASE_URL
    })

    it('should initialize connection successfully', async () => {
      mockClient.connect.mockResolvedValue()
      
      const result = await mongoService.init()
      
      expect(mockClient.connect).toHaveBeenCalled()
      expect(mockClient.db).toHaveBeenCalledWith('test-portfolio')
      expect(mongoService.isConnectedFlag).toBe(true)
      expect(result).toBe(true)
    })

    it('should handle connection failure', async () => {
      const connectionError = new Error('Connection failed')
      mockClient.connect.mockRejectedValue(connectionError)
      
      await expect(mongoService.init()).rejects.toThrow('Connection failed')
      expect(mongoService.isConnectedFlag).toBe(false)
    })

    it('should throw error if no connection string provided', async () => {
      const service = new MongoDBService(null)
      delete process.env.DATABASE_URL
      
      await expect(service.init()).rejects.toThrow('DATABASE_URL environment variable is required')
    })
  })

  describe('Connection Management', () => {
    beforeEach(async () => {
      mockClient.connect.mockResolvedValue()
      await mongoService.init()
    })

    it('should check connection status correctly', () => {
      expect(mongoService.isConnected()).toBe(true)
    })

    it('should return false when not connected', () => {
      mongoService.isConnectedFlag = false
      expect(mongoService.isConnected()).toBe(false)
    })

    it('should perform health check successfully', async () => {
      mockDb.admin().ping.mockResolvedValue()
      
      const health = await mongoService.healthCheck()
      
      expect(health.status).toBe('healthy')
      expect(health.database).toBe('test-portfolio')
      expect(health.timestamp).toBeDefined()
    })

    it('should handle health check failure', async () => {
      const pingError = new Error('Ping failed')
      mockDb.admin().ping.mockRejectedValue(pingError)
      
      const health = await mongoService.healthCheck()
      
      expect(health.status).toBe('unhealthy')
      expect(health.error).toBe('Ping failed')
    })

    it('should close connection successfully', async () => {
      mockClient.close.mockResolvedValue()
      
      await mongoService.close()
      
      expect(mockClient.close).toHaveBeenCalled()
      expect(mongoService.isConnectedFlag).toBe(false)
    })

    it('should handle close connection error', async () => {
      const closeError = new Error('Close failed')
      mockClient.close.mockRejectedValue(closeError)
      
      await expect(mongoService.close()).rejects.toThrow('Close failed')
    })
  })

  describe('Portfolio CRUD Operations', () => {
    const samplePortfolioItem = {
      name: 'Test Project',
      img: 'test.jpg',
      site: 'https://test.com',
      date: '2024',
      category: 'Profile',
      description: 'Test description'
    }

    beforeEach(async () => {
      mockClient.connect.mockResolvedValue()
      await mongoService.init()
    })

    describe('insertPortfolioItem', () => {
      it('should insert portfolio item successfully', async () => {
        const mockInsertResult = { insertedId: 'mock-id' }
        mockCollection.insertOne.mockResolvedValue(mockInsertResult)
        
        const result = await mongoService.insertPortfolioItem(samplePortfolioItem)
        
        expect(mockCollection.insertOne).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Project',
            img: 'test.jpg',
            site: 'https://test.com',
            date: '2024',
            category: 'Profile',
            description: 'Test description',
            created_at: expect.any(Date),
            updated_at: expect.any(Date)
          })
        )
        expect(result).toEqual({
          lastInsertRowid: 'mock-id',
          changes: 1
        })
      })

      it('should handle null optional fields', async () => {
        const itemWithNulls = {
          name: 'Test Project',
          img: 'test.jpg',
          date: '2024',
          category: 'Profile'
        }
        const mockInsertResult = { insertedId: 'mock-id' }
        mockCollection.insertOne.mockResolvedValue(mockInsertResult)
        
        await mongoService.insertPortfolioItem(itemWithNulls)
        
        expect(mockCollection.insertOne).toHaveBeenCalledWith(
          expect.objectContaining({
            site: null,
            description: null
          })
        )
      })

      it('should handle insert error', async () => {
        const insertError = new Error('Insert failed')
        mockCollection.insertOne.mockRejectedValue(insertError)
        
        await expect(mongoService.insertPortfolioItem(samplePortfolioItem))
          .rejects.toThrow('Failed to insert portfolio item: Insert failed')
      })

      it('should reconnect if connection lost', async () => {
        mongoService.isConnectedFlag = false
        mockClient.topology.isConnected.mockReturnValue(false)
        const reconnectSpy = jest.spyOn(mongoService, 'reconnect').mockResolvedValue()
        const mockInsertResult = { insertedId: 'mock-id' }
        mockCollection.insertOne.mockResolvedValue(mockInsertResult)
        
        await mongoService.insertPortfolioItem(samplePortfolioItem)
        
        expect(reconnectSpy).toHaveBeenCalled()
      })
    })

    describe('getAllPortfolioItems', () => {
      it('should get all portfolio items successfully', async () => {
        const mockItems = [
          {
            _id: 'id1',
            name: 'Project 1',
            img: 'img1.jpg',
            site: 'https://site1.com',
            date: '2024',
            category: 'Profile',
            description: 'Description 1',
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            _id: 'id2',
            name: 'Project 2',
            img: 'img2.jpg',
            site: null,
            date: '2023',
            category: 'Blog',
            description: null,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
        
        mockCollection.find.mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockResolvedValue(mockItems)
        })
        
        const result = await mongoService.getAllPortfolioItems()
        
        expect(mockCollection.find).toHaveBeenCalledWith({})
        expect(result).toHaveLength(2)
        expect(result[0]).toEqual(
          expect.objectContaining({
            id: 'id1',
            name: 'Project 1',
            img: 'img1.jpg',
            site: 'https://site1.com',
            date: '2024',
            category: 'Profile',
            description: 'Description 1'
          })
        )
      })

      it('should handle get all items error', async () => {
        const findError = new Error('Find failed')
        mockCollection.find.mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockRejectedValue(findError)
        })
        
        await expect(mongoService.getAllPortfolioItems())
          .rejects.toThrow('Failed to get portfolio items: Find failed')
      })
    })

    describe('getPortfolioItemsByCategory', () => {
      it('should get portfolio items by category successfully', async () => {
        const mockItems = [
          {
            _id: 'id1',
            name: 'Profile Project',
            img: 'profile.jpg',
            site: 'https://profile.com',
            date: '2024',
            category: 'Profile',
            description: 'Profile description',
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
        
        mockCollection.find.mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockResolvedValue(mockItems)
        })
        
        const result = await mongoService.getPortfolioItemsByCategory('Profile')
        
        expect(mockCollection.find).toHaveBeenCalledWith({ category: 'Profile' })
        expect(result).toHaveLength(1)
        expect(result[0].category).toBe('Profile')
      })

      it('should handle get by category error', async () => {
        const findError = new Error('Find by category failed')
        mockCollection.find.mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockRejectedValue(findError)
        })
        
        await expect(mongoService.getPortfolioItemsByCategory('Profile'))
          .rejects.toThrow('Failed to get portfolio items by category: Find by category failed')
      })
    })

    describe('getPortfolioItemById', () => {
      it('should get portfolio item by ObjectId successfully', async () => {
        const mockItem = {
          _id: 'mock-object-id',
          name: 'Test Project',
          img: 'test.jpg',
          site: 'https://test.com',
          date: '2024',
          category: 'Profile',
          description: 'Test description',
          created_at: new Date(),
          updated_at: new Date()
        }
        
        mockCollection.findOne.mockResolvedValue(mockItem)
        
        const result = await mongoService.getPortfolioItemById('mock-object-id')
        
        expect(result).toEqual(
          expect.objectContaining({
            id: 'mock-object-id',
            name: 'Test Project'
          })
        )
      })

      it('should return null when item not found', async () => {
        mockCollection.findOne.mockResolvedValue(null)
        
        const result = await mongoService.getPortfolioItemById('nonexistent-id')
        
        expect(result).toBeNull()
      })

      it('should handle get by id error', async () => {
        const findError = new Error('Find by ID failed')
        mockCollection.findOne.mockRejectedValue(findError)
        
        await expect(mongoService.getPortfolioItemById('test-id'))
          .rejects.toThrow('Failed to get portfolio item by ID: Find by ID failed')
      })
    })
  })

  describe('Skills CRUD Operations', () => {
    const sampleSkill = {
      name: 'JavaScript',
      power: 85,
      category: 'frontend'
    }

    beforeEach(async () => {
      mockClient.connect.mockResolvedValue()
      await mongoService.init()
    })

    describe('validateSkillData', () => {
      it('should validate valid skill data', () => {
        const errors = mongoService.validateSkillData(sampleSkill)
        expect(errors).toHaveLength(0)
      })

      it('should return errors for missing name', () => {
        const invalidSkill = { power: 85, category: 'frontend' }
        const errors = mongoService.validateSkillData(invalidSkill)
        expect(errors).toContain('Skill name is required and must be a non-empty string')
      })

      it('should return errors for invalid power', () => {
        const invalidSkill = { name: 'Test', power: 150, category: 'frontend' }
        const errors = mongoService.validateSkillData(invalidSkill)
        expect(errors).toContain('Skill power must be between 0 and 100')
      })

      it('should return errors for missing category', () => {
        const invalidSkill = { name: 'Test', power: 85 }
        const errors = mongoService.validateSkillData(invalidSkill)
        expect(errors).toContain('Skill category is required and must be a non-empty string')
      })

      it('should return errors for non-integer power', () => {
        const invalidSkill = { name: 'Test', power: 85.5, category: 'frontend' }
        const errors = mongoService.validateSkillData(invalidSkill)
        expect(errors).toContain('Skill power must be an integer')
      })
    })

    describe('insertSkill', () => {
      it('should insert skill successfully', async () => {
        const mockInsertResult = { insertedId: 'mock-skill-id' }
        mockCollection.insertOne.mockResolvedValue(mockInsertResult)
        
        const result = await mongoService.insertSkill(sampleSkill)
        
        expect(mockCollection.insertOne).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'JavaScript',
            power: 85,
            category: 'frontend',
            created_at: expect.any(Date),
            updated_at: expect.any(Date)
          })
        )
        expect(result).toEqual({
          lastInsertRowid: 'mock-skill-id',
          changes: 1
        })
      })

      it('should reject invalid skill data', async () => {
        const invalidSkill = { name: '', power: 150, category: 'frontend' }
        
        await expect(mongoService.insertSkill(invalidSkill))
          .rejects.toThrow('Skill validation failed')
      })

      it('should trim whitespace from skill data', async () => {
        const skillWithWhitespace = {
          name: '  JavaScript  ',
          power: 85,
          category: '  frontend  '
        }
        const mockInsertResult = { insertedId: 'mock-skill-id' }
        mockCollection.insertOne.mockResolvedValue(mockInsertResult)
        
        await mongoService.insertSkill(skillWithWhitespace)
        
        expect(mockCollection.insertOne).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'JavaScript',
            category: 'frontend'
          })
        )
      })

      it('should handle insert skill error', async () => {
        const insertError = new Error('Insert skill failed')
        mockCollection.insertOne.mockRejectedValue(insertError)
        
        await expect(mongoService.insertSkill(sampleSkill))
          .rejects.toThrow('Failed to insert skill: Insert skill failed')
      })
    })

    describe('getAllSkills', () => {
      it('should get all skills successfully', async () => {
        const mockSkills = [
          {
            _id: 'skill1',
            name: 'JavaScript',
            power: 85,
            category: 'frontend',
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            _id: 'skill2',
            name: 'Node.js',
            power: 80,
            category: 'backend',
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
        
        mockCollection.find.mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockResolvedValue(mockSkills)
        })
        
        const result = await mongoService.getAllSkills()
        
        expect(mockCollection.find).toHaveBeenCalledWith({})
        expect(result).toHaveLength(2)
        expect(result[0]).toEqual(
          expect.objectContaining({
            id: 'skill1',
            name: 'JavaScript',
            power: 85,
            category: 'frontend'
          })
        )
      })

      it('should handle get all skills error', async () => {
        const findError = new Error('Find skills failed')
        mockCollection.find.mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockRejectedValue(findError)
        })
        
        await expect(mongoService.getAllSkills())
          .rejects.toThrow('Failed to get skills: Find skills failed')
      })
    })

    describe('getSkillsByCategory', () => {
      it('should get skills by category successfully', async () => {
        const mockSkills = [
          {
            _id: 'skill1',
            name: 'JavaScript',
            power: 85,
            category: 'frontend',
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
        
        mockCollection.find.mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockResolvedValue(mockSkills)
        })
        
        const result = await mongoService.getSkillsByCategory('frontend')
        
        expect(mockCollection.find).toHaveBeenCalledWith({ category: 'frontend' })
        expect(result).toHaveLength(1)
        expect(result[0].category).toBe('frontend')
      })

      it('should handle get skills by category error', async () => {
        const findError = new Error('Find skills by category failed')
        mockCollection.find.mockReturnValue({
          sort: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockRejectedValue(findError)
        })
        
        await expect(mongoService.getSkillsByCategory('frontend'))
          .rejects.toThrow('Failed to get skills by category: Find skills by category failed')
      })
    })
  })

  describe('Utility Methods', () => {
    beforeEach(async () => {
      mockClient.connect.mockResolvedValue()
      await mongoService.init()
    })

    describe('clearPortfolioTable', () => {
      it('should clear portfolio collection successfully', async () => {
        const mockDeleteResult = { deletedCount: 5 }
        mockCollection.deleteMany.mockResolvedValue(mockDeleteResult)
        
        const result = await mongoService.clearPortfolioTable()
        
        expect(mockCollection.deleteMany).toHaveBeenCalledWith({})
        expect(result).toBe(5)
      })

      it('should handle clear portfolio error', async () => {
        const deleteError = new Error('Delete failed')
        mockCollection.deleteMany.mockRejectedValue(deleteError)
        
        await expect(mongoService.clearPortfolioTable())
          .rejects.toThrow('Failed to clear portfolio table: Delete failed')
      })
    })

    describe('clearSkillsTable', () => {
      it('should clear skills collection successfully', async () => {
        const mockDeleteResult = { deletedCount: 3 }
        mockCollection.deleteMany.mockResolvedValue(mockDeleteResult)
        
        const result = await mongoService.clearSkillsTable()
        
        expect(mockCollection.deleteMany).toHaveBeenCalledWith({})
        expect(result).toBe(3)
      })

      it('should handle clear skills error', async () => {
        const deleteError = new Error('Delete skills failed')
        mockCollection.deleteMany.mockRejectedValue(deleteError)
        
        await expect(mongoService.clearSkillsTable())
          .rejects.toThrow('Failed to clear skills table: Delete skills failed')
      })
    })

    describe('getPortfolioCount', () => {
      it('should get portfolio count successfully', async () => {
        mockCollection.countDocuments.mockResolvedValue(10)
        
        const result = await mongoService.getPortfolioCount()
        
        expect(mockCollection.countDocuments).toHaveBeenCalled()
        expect(result).toBe(10)
      })

      it('should handle get portfolio count error', async () => {
        const countError = new Error('Count failed')
        mockCollection.countDocuments.mockRejectedValue(countError)
        
        await expect(mongoService.getPortfolioCount())
          .rejects.toThrow('Failed to get portfolio count: Count failed')
      })
    })

    describe('getSkillsCount', () => {
      it('should get skills count successfully', async () => {
        mockCollection.countDocuments.mockResolvedValue(7)
        
        const result = await mongoService.getSkillsCount()
        
        expect(mockCollection.countDocuments).toHaveBeenCalled()
        expect(result).toBe(7)
      })

      it('should handle get skills count error', async () => {
        const countError = new Error('Skills count failed')
        mockCollection.countDocuments.mockRejectedValue(countError)
        
        await expect(mongoService.getSkillsCount())
          .rejects.toThrow('Failed to get skills count: Skills count failed')
      })
    })
  })

  describe('Error Handling and Reconnection', () => {
    beforeEach(async () => {
      mockClient.connect.mockResolvedValue()
      await mongoService.init()
    })

    describe('reconnect', () => {
      it('should reconnect successfully', async () => {
        mongoService.reconnectAttempts = 0
        mockClient.close.mockResolvedValue()
        mockClient.connect.mockResolvedValue()
        
        const result = await mongoService.reconnect()
        
        expect(mockClient.close).toHaveBeenCalled()
        expect(mockClient.connect).toHaveBeenCalled()
        expect(result).toBe(true)
        expect(mongoService.reconnectAttempts).toBe(1)
      })

      it('should fail after max reconnection attempts', async () => {
        mongoService.reconnectAttempts = 5
        mongoService.maxReconnectAttempts = 5
        
        await expect(mongoService.reconnect())
          .rejects.toThrow('Max reconnection attempts (5) exceeded')
      })

      it('should retry on reconnection failure', async () => {
        mongoService.reconnectAttempts = 0
        mongoService.maxReconnectAttempts = 2
        mockClient.close.mockResolvedValue()
        mockClient.connect
          .mockRejectedValueOnce(new Error('First attempt failed'))
          .mockResolvedValueOnce()
        
        const result = await mongoService.reconnect()
        
        expect(result).toBe(true)
        expect(mongoService.reconnectAttempts).toBe(2)
      })
    })

    describe('ensureConnection', () => {
      it('should not reconnect if already connected', async () => {
        const reconnectSpy = jest.spyOn(mongoService, 'reconnect')
        mongoService.isConnectedFlag = true
        mockClient.topology.isConnected.mockReturnValue(true)
        
        await mongoService.ensureConnection()
        
        expect(reconnectSpy).not.toHaveBeenCalled()
      })

      it('should reconnect if connection lost', async () => {
        const reconnectSpy = jest.spyOn(mongoService, 'reconnect').mockResolvedValue()
        mongoService.isConnectedFlag = false
        mockClient.topology.isConnected.mockReturnValue(false)
        
        await mongoService.ensureConnection()
        
        expect(reconnectSpy).toHaveBeenCalled()
      })
    })
  })

  describe('Database Management', () => {
    beforeEach(async () => {
      mockClient.connect.mockResolvedValue()
      await mongoService.init()
    })

    describe('getConnectionInfo', () => {
      it('should get connection info successfully', async () => {
        const mockServerStatus = {
          version: '6.0.0',
          uptime: 12345,
          connections: { current: 5, available: 995 }
        }
        mockDb.admin().serverStatus.mockResolvedValue(mockServerStatus)
        
        const info = await mongoService.getConnectionInfo()
        
        expect(info).toEqual({
          status: 'connected',
          connected: true,
          serverVersion: '6.0.0',
          uptime: 12345,
          connections: { current: 5, available: 995 },
          database: 'test-portfolio'
        })
      })

      it('should handle connection info error', async () => {
        const serverError = new Error('Server status failed')
        mockDb.admin().serverStatus.mockRejectedValue(serverError)
        
        const info = await mongoService.getConnectionInfo()
        
        expect(info).toEqual({
          status: 'error',
          connected: false,
          error: 'Server status failed'
        })
      })

      it('should handle no client case', async () => {
        mongoService.client = null
        
        const info = await mongoService.getConnectionInfo()
        
        expect(info).toEqual({
          status: 'no_client',
          connected: false
        })
      })
    })

    describe('cleanup', () => {
      it('should cleanup successfully', async () => {
        mockClient.close.mockResolvedValue()
        
        const result = await mongoService.cleanup()
        
        expect(mockClient.close).toHaveBeenCalledWith(true)
        expect(mongoService.isConnectedFlag).toBe(false)
        expect(mongoService.client).toBeNull()
        expect(mongoService.db).toBeNull()
        expect(result).toBe(true)
      })

      it('should handle cleanup error', async () => {
        const cleanupError = new Error('Cleanup failed')
        mockClient.close.mockRejectedValue(cleanupError)
        
        await expect(mongoService.cleanup())
          .rejects.toThrow('Failed to cleanup MongoDB service: Cleanup failed')
      })
    })
  })
})
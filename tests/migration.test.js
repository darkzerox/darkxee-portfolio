import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
import fs from 'fs'
import path from 'path'
import { MongoMemoryServer } from 'mongodb-memory-server'

// Mock file system operations
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}

// DatabaseService has been removed after migration completion

// Mock MongoDBService
const mockMongoDBService = {
  init: jest.fn(),
  close: jest.fn(),
  insertPortfolioItem: jest.fn(),
  insertSkill: jest.fn(),
  clearPortfolioTable: jest.fn(),
  clearSkillsTable: jest.fn(),
  getPortfolioCount: jest.fn(),
  getSkillsCount: jest.fn()
}

// Mock modules
jest.mock('fs', () => mockFs)
jest.mock('../src/services/MongoDBService.js', () => ({
  default: jest.fn(() => mockMongoDBService)
}))

import DataMigrator from '../src/scripts/migrateToMongo.js'

describe('Migration Testing Suite', () => {
  let migrator
  let mongoServer

  beforeAll(async () => {
    // Start in-memory MongoDB server for integration tests
    mongoServer = await MongoMemoryServer.create()
    process.env.DATABASE_URL = mongoServer.getUri()
  })

  afterAll(async () => {
    // Stop in-memory MongoDB server
    if (mongoServer) {
      await mongoServer.stop()
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
    migrator = new DataMigrator()
    
    // Reset mock implementations
    mockFs.existsSync.mockReturnValue(false)
    mockFs.readFileSync.mockReturnValue('[]')
    mockMongoDBService.init.mockResolvedValue()
    mockMongoDBService.close.mockResolvedValue()
    mockMongoDBService.insertPortfolioItem.mockResolvedValue({ insertedId: 'mock-id' })
    mockMongoDBService.insertSkill.mockResolvedValue({ insertedId: 'mock-skill-id' })
    mockMongoDBService.clearPortfolioTable.mockResolvedValue(0)
    mockMongoDBService.clearSkillsTable.mockResolvedValue(0)
  })

  afterEach(async () => {
    if (migrator) {
      await migrator.cleanup()
    }
  })

  describe('Data Source Detection', () => {
    describe('Data Source Detection (SQLite removed)', () => {
      it('should handle missing data sources', async () => {
        // Arrange
        mockFs.existsSync.mockReturnValue(false)

        // Act
        const sources = await migrator.detectDataSources()

        // Assert
        expect(sources.portfolioJson).toBe(false)
        expect(sources.skillsJson).toBe(false)
      })
    })

    describe('JSON File Detection', () => {
      it('should detect portfolio JSON file when exists and readable', async () => {
        // Arrange
        const mockPortfolioData = [
          { name: 'Test Project', img: 'test.jpg', date: '2024', cateogry: 'Profile' }
        ]
        mockFs.existsSync.mockImplementation((filePath) => {
          return filePath.includes('portfolio.json')
        })
        mockFs.readFileSync.mockImplementation((filePath) => {
          if (filePath.includes('portfolio.json')) {
            return JSON.stringify(mockPortfolioData)
          }
          return '[]'
        })

        // Act
        const sources = await migrator.detectDataSources()

        // Assert
        expect(sources.portfolioJson).toBe(true)
        expect(migrator.migrationReport.dataSources).toContainEqual({
          type: 'Portfolio JSON',
          path: expect.stringContaining('portfolio.json'),
          records: 1
        })
      })

      it('should detect skills JSON file when exists and readable', async () => {
        // Arrange
        const mockSkillsData = [
          { name: 'JavaScript', power: 85, cate: 'frontend' }
        ]
        mockFs.existsSync.mockImplementation((filePath) => {
          return filePath.includes('skill.json')
        })
        mockFs.readFileSync.mockImplementation((filePath) => {
          if (filePath.includes('skill.json')) {
            return JSON.stringify(mockSkillsData)
          }
          return '[]'
        })

        // Act
        const sources = await migrator.detectDataSources()

        // Assert
        expect(sources.skillsJson).toBe(true)
        expect(migrator.migrationReport.dataSources).toContainEqual({
          type: 'Skills JSON',
          path: expect.stringContaining('skill.json'),
          records: 1
        })
      })

      it('should handle JSON file read errors', async () => {
        // Arrange
        mockFs.existsSync.mockImplementation((filePath) => {
          return filePath.includes('portfolio.json')
        })
        mockFs.readFileSync.mockImplementation(() => {
          throw new Error('File read error')
        })

        // Act
        const sources = await migrator.detectDataSources()

        // Assert
        expect(sources.portfolioJson).toBe(false)
        expect(migrator.migrationReport.warnings).toContain('Portfolio JSON not readable: File read error')
      })

      it('should handle invalid JSON content', async () => {
        // Arrange
        mockFs.existsSync.mockImplementation((filePath) => {
          return filePath.includes('portfolio.json')
        })
        mockFs.readFileSync.mockReturnValue('invalid json content')

        // Act
        const sources = await migrator.detectDataSources()

        // Assert
        expect(sources.portfolioJson).toBe(false)
        expect(migrator.migrationReport.warnings).toContainEqual(
          expect.stringContaining('Portfolio JSON not readable:')
        )
      })
    })
  })

  describe('Data Reading from Sources', () => {
    // SQLite data reading tests removed after migration completion

    describe('JSON Data Reading', () => {
      it('should read portfolio data from JSON successfully', async () => {
        // Arrange
        const mockPortfolioData = [
          {
            name: 'Test Project',
            img: 'test.jpg',
            site: 'https://test.com',
            date: '2024',
            cateogry: 'Profile',
            desc: 'Test description'
          }
        ]
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPortfolioData))

        // Act
        const result = await migrator.readPortfolioFromJSON()

        // Assert
        expect(result).toEqual(mockPortfolioData)
        expect(mockFs.readFileSync).toHaveBeenCalledWith(
          expect.stringContaining('portfolio.json'),
          'utf-8'
        )
      })

      it('should read skills data from JSON successfully', async () => {
        // Arrange
        const mockSkillsData = [
          {
            name: 'JavaScript',
            power: 85,
            cate: 'frontend'
          }
        ]
        mockFs.readFileSync.mockReturnValue(JSON.stringify(mockSkillsData))

        // Act
        const result = await migrator.readSkillsFromJSON()

        // Assert
        expect(result).toEqual(mockSkillsData)
        expect(mockFs.readFileSync).toHaveBeenCalledWith(
          expect.stringContaining('skill.json'),
          'utf-8'
        )
      })

      it('should handle JSON read errors', async () => {
        // Arrange
        mockFs.readFileSync.mockImplementation(() => {
          throw new Error('File not found')
        })

        // Act & Assert
        await expect(migrator.readPortfolioFromJSON()).rejects.toThrow('File not found')
        expect(migrator.migrationReport.errors).toContain('JSON portfolio read error: File not found')
      })

      it('should handle invalid JSON parsing', async () => {
        // Arrange
        mockFs.readFileSync.mockReturnValue('invalid json')

        // Act & Assert
        await expect(migrator.readPortfolioFromJSON()).rejects.toThrow()
        expect(migrator.migrationReport.errors).toContainEqual(
          expect.stringContaining('JSON portfolio read error:')
        )
      })
    })

    describe('Data Source Priority (JSON only after SQLite removal)', () => {
      it('should use JSON data when available', async () => {
        // Arrange
        const jsonData = [{ name: 'JSON Project', img: 'json.jpg', date: '2024', cateogry: 'Profile' }]
        mockFs.readFileSync.mockReturnValue(JSON.stringify(jsonData))

        const sources = { portfolioJson: true }

        // Act
        const result = await migrator.getPortfolioData(sources)

        // Assert
        expect(result).toEqual(jsonData)
        expect(mockFs.readFileSync).toHaveBeenCalled()
      })

      it('should throw error when no data sources available', async () => {
        // Arrange
        const sources = { portfolioJson: false }

        // Act & Assert
        await expect(migrator.getPortfolioData(sources)).rejects.toThrow('No portfolio data source available')
      })
    })
  })

  describe('Data Transformation and Validation', () => {
    describe('Portfolio Data Transformation', () => {
      it('should fix common typos in portfolio data', () => {
        // Arrange
        const portfolioData = [
          {
            name: 'Test Project',
            img: 'test.jpg',
            date: '2024',
            cateogry: 'Profile', // Typo: should be 'category'
            desc: 'Test description' // Should be 'description'
          }
        ]

        // Act
        const result = migrator.validateAndTransformPortfolio(portfolioData)

        // Assert
        expect(result).toHaveLength(1)
        expect(result[0]).toEqual(
          expect.objectContaining({
            category: 'Profile',
            description: 'Test description'
          })
        )
        expect(result[0]).not.toHaveProperty('cateogry')
        expect(result[0]).not.toHaveProperty('desc')
      })

      it('should validate required fields', () => {
        // Arrange
        const portfolioData = [
          {
            // Missing name
            img: 'test.jpg',
            date: '2024',
            category: 'Profile'
          },
          {
            name: 'Valid Project',
            // Missing img
            date: '2024',
            category: 'Profile'
          },
          {
            name: 'Valid Project',
            img: 'test.jpg',
            // Missing date
            category: 'Profile'
          },
          {
            name: 'Valid Project',
            img: 'test.jpg',
            date: '2024'
            // Missing category
          }
        ]

        // Act
        const result = migrator.validateAndTransformPortfolio(portfolioData)

        // Assert
        expect(result).toHaveLength(0) // All items should be invalid
        expect(migrator.migrationReport.errors).toHaveLength(4)
        expect(migrator.migrationReport.errors).toContainEqual(
          expect.stringContaining('Missing or invalid name field')
        )
        expect(migrator.migrationReport.errors).toContainEqual(
          expect.stringContaining('Missing or invalid img field')
        )
        expect(migrator.migrationReport.errors).toContainEqual(
          expect.stringContaining('Missing or invalid date field')
        )
        expect(migrator.migrationReport.errors).toContainEqual(
          expect.stringContaining('Missing or invalid category field')
        )
      })

      it('should handle optional fields correctly', () => {
        // Arrange
        const portfolioData = [
          {
            name: 'Test Project',
            img: 'test.jpg',
            date: '2024',
            category: 'Profile'
            // No site or description
          }
        ]

        // Act
        const result = migrator.validateAndTransformPortfolio(portfolioData)

        // Assert
        expect(result).toHaveLength(1)
        expect(result[0]).toEqual(
          expect.objectContaining({
            site: null,
            description: null
          })
        )
      })

      it('should trim whitespace from string fields', () => {
        // Arrange
        const portfolioData = [
          {
            name: '  Test Project  ',
            img: '  test.jpg  ',
            site: '  https://test.com  ',
            date: '  2024  ',
            category: '  Profile  ',
            description: '  Test description  '
          }
        ]

        // Act
        const result = migrator.validateAndTransformPortfolio(portfolioData)

        // Assert
        expect(result).toHaveLength(1)
        expect(result[0]).toEqual(
          expect.objectContaining({
            name: 'Test Project',
            img: 'test.jpg',
            site: 'https://test.com',
            date: '2024',
            category: 'Profile',
            description: 'Test description'
          })
        )
      })

      it('should warn about unknown categories', () => {
        // Arrange
        const portfolioData = [
          {
            name: 'Test Project',
            img: 'test.jpg',
            date: '2024',
            category: 'UnknownCategory'
          }
        ]

        // Act
        const result = migrator.validateAndTransformPortfolio(portfolioData)

        // Assert
        expect(result).toHaveLength(1)
        expect(result[0].category).toBe('UnknownCategory') // Should keep as-is
        expect(migrator.migrationReport.warnings).toContain('Unknown portfolio category: UnknownCategory')
      })
    })

    describe('Skills Data Transformation', () => {
      it('should fix common typos in skills data', () => {
        // Arrange
        const skillsData = [
          {
            name: 'JavaScript',
            power: 85,
            cate: 'frontend' // Typo: should be 'category'
          }
        ]

        // Act
        const result = migrator.validateAndTransformSkills(skillsData)

        // Assert
        expect(result).toHaveLength(1)
        expect(result[0]).toEqual(
          expect.objectContaining({
            category: 'frontend'
          })
        )
        expect(result[0]).not.toHaveProperty('cate')
      })

      it('should validate required fields', () => {
        // Arrange
        const skillsData = [
          {
            // Missing name
            power: 85,
            category: 'frontend'
          },
          {
            name: 'JavaScript',
            // Missing power
            category: 'frontend'
          },
          {
            name: 'JavaScript',
            power: 85
            // Missing category
          }
        ]

        // Act
        const result = migrator.validateAndTransformSkills(skillsData)

        // Assert
        expect(result).toHaveLength(0) // All items should be invalid
        expect(migrator.migrationReport.errors).toHaveLength(3)
        expect(migrator.migrationReport.errors).toContainEqual(
          expect.stringContaining('Missing or invalid name field')
        )
        expect(migrator.migrationReport.errors).toContainEqual(
          expect.stringContaining('Missing power field')
        )
        expect(migrator.migrationReport.errors).toContainEqual(
          expect.stringContaining('Missing or invalid category field')
        )
      })

      it('should validate power range', () => {
        // Arrange
        const skillsData = [
          {
            name: 'JavaScript',
            power: -10, // Invalid: below 0
            category: 'frontend'
          },
          {
            name: 'Python',
            power: 150, // Invalid: above 100
            category: 'backend'
          },
          {
            name: 'HTML',
            power: 'invalid', // Invalid: not a number
            category: 'frontend'
          }
        ]

        // Act
        const result = migrator.validateAndTransformSkills(skillsData)

        // Assert
        expect(result).toHaveLength(0) // All items should be invalid
        expect(migrator.migrationReport.errors).toContainEqual(
          expect.stringContaining('Invalid power value: -10. Must be between 0-100')
        )
        expect(migrator.migrationReport.errors).toContainEqual(
          expect.stringContaining('Invalid power value: 150. Must be between 0-100')
        )
        expect(migrator.migrationReport.errors).toContainEqual(
          expect.stringContaining('Invalid power value: invalid. Must be between 0-100')
        )
      })

      it('should normalize category values', () => {
        // Arrange
        const skillsData = [
          {
            name: 'JavaScript',
            power: 85,
            category: 'FRONTEND' // Should be normalized to lowercase
          },
          {
            name: 'Node.js',
            power: 80,
            category: 'Backend' // Should be normalized to lowercase
          }
        ]

        // Act
        const result = migrator.validateAndTransformSkills(skillsData)

        // Assert
        expect(result).toHaveLength(2)
        expect(result[0].category).toBe('frontend')
        expect(result[1].category).toBe('backend')
      })

      it('should warn about unknown categories', () => {
        // Arrange
        const skillsData = [
          {
            name: 'Unknown Skill',
            power: 50,
            category: 'unknown-category'
          }
        ]

        // Act
        const result = migrator.validateAndTransformSkills(skillsData)

        // Assert
        expect(result).toHaveLength(1)
        expect(result[0].category).toBe('unknown-category') // Should keep as-is
        expect(migrator.migrationReport.warnings).toContain('Unknown skill category: unknown-category')
      })

      it('should trim whitespace from string fields', () => {
        // Arrange
        const skillsData = [
          {
            name: '  JavaScript  ',
            power: 85,
            category: '  frontend  '
          }
        ]

        // Act
        const result = migrator.validateAndTransformSkills(skillsData)

        // Assert
        expect(result).toHaveLength(1)
        expect(result[0]).toEqual(
          expect.objectContaining({
            name: 'JavaScript',
            category: 'frontend'
          })
        )
      })
    })

    describe('Data Integrity Validation', () => {
      it('should detect duplicate portfolio items', () => {
        // Arrange
        const portfolioData = [
          { name: 'Project A', img: 'a.jpg', date: '2024', category: 'Profile' },
          { name: 'Project B', img: 'b.jpg', date: '2024', category: 'Blog' },
          { name: 'Project A', img: 'a2.jpg', date: '2024', category: 'Profile' } // Duplicate name
        ]
        const skillsData = []

        // Act
        const result = migrator.validateDataIntegrity(portfolioData, skillsData)

        // Assert
        expect(result.duplicatePortfolio).toContain('Project A')
        expect(migrator.migrationReport.warnings).toContain('Duplicate portfolio items: Project A')
      })

      it('should detect duplicate skills', () => {
        // Arrange
        const portfolioData = []
        const skillsData = [
          { name: 'JavaScript', power: 85, category: 'frontend' },
          { name: 'Python', power: 80, category: 'backend' },
          { name: 'JavaScript', power: 90, category: 'frontend' } // Duplicate name
        ]

        // Act
        const result = migrator.validateDataIntegrity(portfolioData, skillsData)

        // Assert
        expect(result.duplicateSkills).toContain('JavaScript')
        expect(migrator.migrationReport.warnings).toContain('Duplicate skills: JavaScript')
      })

      it('should validate data availability', () => {
        // Arrange
        const portfolioData = [
          { name: 'Project A', img: 'a.jpg', date: '2024', category: 'Profile' }
        ]
        const skillsData = [
          { name: 'JavaScript', power: 85, category: 'frontend' }
        ]

        // Act
        const result = migrator.validateDataIntegrity(portfolioData, skillsData)

        // Assert
        expect(result.portfolioValid).toBe(true)
        expect(result.skillsValid).toBe(true)
      })

      it('should handle empty data sets', () => {
        // Arrange
        const portfolioData = []
        const skillsData = []

        // Act
        const result = migrator.validateDataIntegrity(portfolioData, skillsData)

        // Assert
        expect(result.portfolioValid).toBe(false)
        expect(result.skillsValid).toBe(false)
      })
    })
  })

  describe('Batch Migration with Progress Tracking', () => {
    describe('Portfolio Migration', () => {
      it('should migrate portfolio data in batches', async () => {
        // Arrange
        const portfolioData = [
          { name: 'Project 1', img: '1.jpg', date: '2024', category: 'Profile' },
          { name: 'Project 2', img: '2.jpg', date: '2024', category: 'Blog' },
          { name: 'Project 3', img: '3.jpg', date: '2024', category: 'Ecommerce' }
        ]
        const batchSize = 2

        // Act
        const result = await migrator.migratePortfolioBatch(portfolioData, batchSize)

        // Assert
        expect(result.migrated).toBe(3)
        expect(result.errors).toHaveLength(0)
        expect(mockMongoDBService.insertPortfolioItem).toHaveBeenCalledTimes(3)
        expect(migrator.migrationReport.portfolioMigrated).toBe(3)
      })

      it('should handle portfolio migration errors gracefully', async () => {
        // Arrange
        const portfolioData = [
          { name: 'Project 1', img: '1.jpg', date: '2024', category: 'Profile' },
          { name: 'Project 2', img: '2.jpg', date: '2024', category: 'Blog' }
        ]
        
        mockMongoDBService.insertPortfolioItem
          .mockResolvedValueOnce({ insertedId: 'id1' })
          .mockRejectedValueOnce(new Error('Insert failed'))

        // Act
        const result = await migrator.migratePortfolioBatch(portfolioData, 1)

        // Assert
        expect(result.migrated).toBe(1)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0]).toContain('Failed to insert portfolio item "Project 2": Insert failed')
        expect(migrator.migrationReport.portfolioMigrated).toBe(1)
      })

      it('should handle batch processing errors', async () => {
        // Arrange
        const portfolioData = [
          { name: 'Project 1', img: '1.jpg', date: '2024', category: 'Profile' }
        ]
        
        mockMongoDBService.insertPortfolioItem.mockRejectedValue(new Error('Database connection lost'))

        // Act
        const result = await migrator.migratePortfolioBatch(portfolioData, 1)

        // Assert
        expect(result.migrated).toBe(0)
        expect(result.errors).toHaveLength(1)
        expect(migrator.migrationReport.errors).toContainEqual(
          expect.stringContaining('Failed to insert portfolio item')
        )
      })
    })

    describe('Skills Migration', () => {
      it('should migrate skills data in batches', async () => {
        // Arrange
        const skillsData = [
          { name: 'JavaScript', power: 85, category: 'frontend' },
          { name: 'Python', power: 80, category: 'backend' },
          { name: 'MongoDB', power: 75, category: 'database' }
        ]
        const batchSize = 2

        // Act
        const result = await migrator.migrateSkillsBatch(skillsData, batchSize)

        // Assert
        expect(result.migrated).toBe(3)
        expect(result.errors).toHaveLength(0)
        expect(mockMongoDBService.insertSkill).toHaveBeenCalledTimes(3)
        expect(migrator.migrationReport.skillsMigrated).toBe(3)
      })

      it('should handle skills migration errors gracefully', async () => {
        // Arrange
        const skillsData = [
          { name: 'JavaScript', power: 85, category: 'frontend' },
          { name: 'Python', power: 80, category: 'backend' }
        ]
        
        mockMongoDBService.insertSkill
          .mockResolvedValueOnce({ insertedId: 'skill1' })
          .mockRejectedValueOnce(new Error('Skill insert failed'))

        // Act
        const result = await migrator.migrateSkillsBatch(skillsData, 1)

        // Assert
        expect(result.migrated).toBe(1)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0]).toContain('Failed to insert skill "Python": Skill insert failed')
        expect(migrator.migrationReport.skillsMigrated).toBe(1)
      })
    })
  })

  describe('Migration Rollback and Error Recovery', () => {
    describe('Rollback Functionality', () => {
      it('should rollback migration successfully', async () => {
        // Arrange
        mockMongoDBService.clearPortfolioTable.mockResolvedValue(5)
        mockMongoDBService.clearSkillsTable.mockResolvedValue(3)

        // Act
        const result = await migrator.rollbackMigration()

        // Assert
        expect(result).toBe(true)
        expect(mockMongoDBService.clearPortfolioTable).toHaveBeenCalled()
        expect(mockMongoDBService.clearSkillsTable).toHaveBeenCalled()
        expect(migrator.migrationReport.errors).toContain('Migration rolled back - all data cleared')
      })

      it('should handle rollback failures', async () => {
        // Arrange
        mockMongoDBService.clearPortfolioTable.mockRejectedValue(new Error('Clear failed'))

        // Act
        const result = await migrator.rollbackMigration()

        // Assert
        expect(result).toBe(false)
        expect(migrator.migrationReport.errors).toContain('Rollback failed: Clear failed')
      })
    })

    describe('Error Recovery', () => {
      it('should continue migration after individual item failures', async () => {
        // Arrange
        const portfolioData = [
          { name: 'Project 1', img: '1.jpg', date: '2024', category: 'Profile' },
          { name: 'Project 2', img: '2.jpg', date: '2024', category: 'Blog' },
          { name: 'Project 3', img: '3.jpg', date: '2024', category: 'Ecommerce' }
        ]
        
        mockMongoDBService.insertPortfolioItem
          .mockResolvedValueOnce({ insertedId: 'id1' })
          .mockRejectedValueOnce(new Error('Item 2 failed'))
          .mockResolvedValueOnce({ insertedId: 'id3' })

        // Act
        const result = await migrator.migratePortfolioBatch(portfolioData, 1)

        // Assert
        expect(result.migrated).toBe(2) // Should continue after failure
        expect(result.errors).toHaveLength(1)
        expect(mockMongoDBService.insertPortfolioItem).toHaveBeenCalledTimes(3)
      })

      it('should handle connection recovery during migration', async () => {
        // Arrange
        const portfolioData = [
          { name: 'Project 1', img: '1.jpg', date: '2024', category: 'Profile' }
        ]
        
        // First call fails, second succeeds (simulating reconnection)
        mockMongoDBService.init
          .mockRejectedValueOnce(new Error('Connection failed'))
          .mockResolvedValueOnce()

        // Act & Assert
        await expect(migrator.migratePortfolioBatch(portfolioData, 1)).rejects.toThrow('Connection failed')
      })
    })

    describe('Full Migration Error Handling', () => {
      it('should rollback on migration failure when rollbackOnError is true', async () => {
        // Arrange
        mockFs.existsSync.mockImplementation((filePath) => {
          return filePath.includes('portfolio.json')
        })
        mockFs.readFileSync.mockReturnValue(JSON.stringify([
          { name: 'Test Project', img: 'test.jpg', date: '2024', cateogry: 'Profile' }
        ]))
        
        mockMongoDBService.insertPortfolioItem.mockRejectedValue(new Error('Migration failed'))
        mockMongoDBService.clearPortfolioTable.mockResolvedValue(0)
        mockMongoDBService.clearSkillsTable.mockResolvedValue(0)

        const options = { rollbackOnError: true, batchSize: 1 }

        // Act & Assert
        await expect(migrator.migrate(options)).rejects.toThrow('Migration failed')
        expect(mockMongoDBService.clearPortfolioTable).toHaveBeenCalled()
        expect(mockMongoDBService.clearSkillsTable).toHaveBeenCalled()
      })

      it('should not rollback when rollbackOnError is false', async () => {
        // Arrange
        mockFs.existsSync.mockImplementation((filePath) => {
          return filePath.includes('portfolio.json')
        })
        mockFs.readFileSync.mockReturnValue(JSON.stringify([
          { name: 'Test Project', img: 'test.jpg', date: '2024', cateogry: 'Profile' }
        ]))
        
        mockMongoDBService.insertPortfolioItem.mockRejectedValue(new Error('Migration failed'))

        const options = { rollbackOnError: false, batchSize: 1 }

        // Act & Assert
        await expect(migrator.migrate(options)).rejects.toThrow('Migration failed')
        expect(mockMongoDBService.clearPortfolioTable).not.toHaveBeenCalled()
        expect(mockMongoDBService.clearSkillsTable).not.toHaveBeenCalled()
      })

      it('should handle no data sources error', async () => {
        // Arrange
        mockFs.existsSync.mockReturnValue(false)

        // Act & Assert
        await expect(migrator.migrate()).rejects.toThrow('No data sources available for migration')
      })

      it('should handle validation failures', async () => {
        // Arrange
        mockFs.existsSync.mockImplementation((filePath) => {
          return filePath.includes('portfolio.json')
        })
        mockFs.readFileSync.mockReturnValue(JSON.stringify([
          { name: '', img: '', date: '', category: '' } // Invalid data
        ]))

        // Act & Assert
        await expect(migrator.migrate()).rejects.toThrow('No valid data found after validation')
      })
    })
  })

  describe('Migration Report Generation', () => {
    it('should generate comprehensive migration report', () => {
      // Arrange
      migrator.migrationReport.startTime = new Date('2024-01-01T10:00:00Z')
      migrator.migrationReport.portfolioMigrated = 10
      migrator.migrationReport.skillsMigrated = 5
      migrator.migrationReport.dataSources = [
        { type: 'SQLite', portfolioRecords: 10, skillsRecords: 5 }
      ]
      migrator.migrationReport.warnings = ['Test warning']
      migrator.migrationReport.errors = []

      mockFs.writeFileSync.mockImplementation(() => {}) // Mock file write

      // Act
      const report = migrator.generateMigrationReport()

      // Assert
      expect(report.success).toBe(true)
      expect(report.portfolioMigrated).toBe(10)
      expect(report.skillsMigrated).toBe(5)
      expect(report.duration).toBeGreaterThan(0)
      expect(report.warnings).toContain('Test warning')
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('migration-report.json'),
        expect.any(String)
      )
    })

    it('should mark report as failed when errors exist', () => {
      // Arrange
      migrator.migrationReport.errors = ['Test error']

      // Act
      const report = migrator.generateMigrationReport()

      // Assert
      expect(report.success).toBe(false)
    })

    it('should handle report file write errors', () => {
      // Arrange
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed')
      })

      // Act
      const report = migrator.generateMigrationReport()

      // Assert
      expect(report).toBeDefined() // Should still return report even if file write fails
    })
  })

  describe('Integration Tests', () => {
    it('should perform complete migration from JSON sources', async () => {
      // Arrange
      const portfolioData = [
        {
          name: 'Test Project',
          img: 'test.jpg',
          site: 'https://test.com',
          date: '2024',
          cateogry: 'Profile', // Typo to test transformation
          desc: 'Test description'
        }
      ]
      const skillsData = [
        {
          name: 'JavaScript',
          power: 85,
          cate: 'frontend' // Typo to test transformation
        }
      ]

      mockFs.existsSync.mockImplementation((filePath) => {
        return filePath.includes('.json')
      })
      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('portfolio.json')) {
          return JSON.stringify(portfolioData)
        }
        if (filePath.includes('skill.json')) {
          return JSON.stringify(skillsData)
        }
        return '[]'
      })

      const options = { batchSize: 1, rollbackOnError: false }

      // Act
      const report = await migrator.migrate(options)

      // Assert
      expect(report.success).toBe(true)
      expect(report.portfolioMigrated).toBe(1)
      expect(report.skillsMigrated).toBe(1)
      expect(mockMongoDBService.insertPortfolioItem).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Profile', // Should be fixed from 'cateogry'
          description: 'Test description' // Should be fixed from 'desc'
        })
      )
      expect(mockMongoDBService.insertSkill).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'frontend' // Should be fixed from 'cate'
        })
      )
    })

    it('should handle mixed success and failure scenarios', async () => {
      // Arrange
      const portfolioData = [
        { name: 'Valid Project', img: 'valid.jpg', date: '2024', category: 'Profile' },
        { name: '', img: 'invalid.jpg', date: '2024', category: 'Profile' } // Invalid
      ]

      mockFs.existsSync.mockImplementation((filePath) => {
        return filePath.includes('portfolio.json')
      })
      mockFs.readFileSync.mockReturnValue(JSON.stringify(portfolioData))

      const options = { batchSize: 1, rollbackOnError: false }

      // Act
      const report = await migrator.migrate(options)

      // Assert
      expect(report.portfolioMigrated).toBe(1) // Only valid item migrated
      expect(report.errors).toContainEqual(
        expect.stringContaining('Missing or invalid name field')
      )
    })
  })
})
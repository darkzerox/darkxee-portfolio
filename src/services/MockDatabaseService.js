import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

/**
 * Mock Database Service for development/testing when better-sqlite3 has compilation issues
 * This provides the same interface as DatabaseService but uses JSON files for storage
 */
class MockDatabaseService {
  constructor(dataDir = null) {
    this.dataDir = dataDir || join(process.cwd(), 'data')
    this.portfolioFile = join(this.dataDir, 'portfolio.json')
    this.skillsFile = join(this.dataDir, 'skills.json')
    this.portfolioData = []
    this.skillsData = []
    this.nextPortfolioId = 1
    this.nextSkillId = 1
  }

  /**
   * Initialize mock database
   */
  init() {
    try {
      // Create data directory if it doesn't exist
      if (!existsSync(this.dataDir)) {
        mkdirSync(this.dataDir, { recursive: true })
      }

      // Load existing data if files exist
      if (existsSync(this.portfolioFile)) {
        this.portfolioData = JSON.parse(
          readFileSync(this.portfolioFile, 'utf8')
        )
        this.nextPortfolioId =
          Math.max(...this.portfolioData.map(item => item.id || 0)) + 1
      }

      if (existsSync(this.skillsFile)) {
        this.skillsData = JSON.parse(readFileSync(this.skillsFile, 'utf8'))
        this.nextSkillId =
          Math.max(...this.skillsData.map(item => item.id || 0)) + 1
      }

      console.log('Mock database initialized successfully')
    } catch (error) {
      console.error('Failed to initialize mock database:', error)
      throw error
    }
  }

  /**
   * Save data to JSON files
   */
  saveData() {
    writeFileSync(
      this.portfolioFile,
      JSON.stringify(this.portfolioData, null, 2)
    )
    writeFileSync(this.skillsFile, JSON.stringify(this.skillsData, null, 2))
  }

  /**
   * Get all portfolio items with optional filtering
   */
  getPortfolioItems(filters = {}) {
    let results = [...this.portfolioData]

    if (filters.category && filters.category !== 'All') {
      results = results.filter(item => item.category === filters.category)
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      results = results.filter(
        item =>
          item.name.toLowerCase().includes(searchTerm) ||
          (item.description &&
            item.description.toLowerCase().includes(searchTerm))
      )
    }

    // Sort by date descending
    results.sort((a, b) => {
      const dateA = new Date(a.date || '1970')
      const dateB = new Date(b.date || '1970')
      return dateB - dateA
    })

    return results
  }

  /**
   * Get portfolio item by ID
   */
  getPortfolioById(id) {
    return this.portfolioData.find(item => item.id === parseInt(id))
  }

  /**
   * Get all skills with optional category filtering
   */
  getSkills(category = null) {
    let results = [...this.skillsData]

    if (category) {
      results = results.filter(skill => skill.category === category)
    }

    // Sort by category, then by power descending
    results.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category)
      }
      return b.power - a.power
    })

    return results
  }

  /**
   * Insert portfolio item
   */
  insertPortfolioItem(item) {
    const newItem = {
      id: this.nextPortfolioId++,
      name: item.name,
      img: item.img,
      site: item.site,
      date: item.date,
      category: item.category,
      description: item.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    this.portfolioData.push(newItem)
    this.saveData()

    return { lastInsertRowid: newItem.id, changes: 1 }
  }

  /**
   * Insert skill item
   */
  insertSkill(skill) {
    const newSkill = {
      id: this.nextSkillId++,
      name: skill.name,
      power: Math.max(0, Math.min(100, skill.power)), // Ensure power is between 0-100
      category: skill.category,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    this.skillsData.push(newSkill)
    this.saveData()

    return { lastInsertRowid: newSkill.id, changes: 1 }
  }

  /**
   * Clear all data from tables (for migration purposes)
   */
  clearTables() {
    this.portfolioData = []
    this.skillsData = []
    this.nextPortfolioId = 1
    this.nextSkillId = 1
    this.saveData()
  }

  /**
   * Close database connection (no-op for mock)
   */
  close() {
    // No-op for mock database
  }

  /**
   * Get database statistics
   */
  getStats() {
    return {
      portfolio: this.portfolioData.length,
      skills: this.skillsData.length,
    }
  }
}

export default MockDatabaseService

import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class DatabaseService {
  constructor(dbPath = null) {
    // Create data directory if it doesn't exist
    const dataDir = join(process.cwd(), 'data')
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true })
    }

    this.dbPath = dbPath || join(dataDir, 'portfolio.db')
    this.db = null
    this.init()
  }

  init() {
    try {
      this.db = new Database(this.dbPath)
      this.db.pragma('journal_mode = WAL')
      this.createTables()
      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Failed to initialize database:', error)
      throw error
    }
  }

  createTables() {
    // Create portfolio table
    const createPortfolioTable = `
      CREATE TABLE IF NOT EXISTS portfolio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        img TEXT NOT NULL,
        site TEXT,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create skills table
    const createSkillsTable = `
      CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        power INTEGER NOT NULL CHECK(power >= 0 AND power <= 100),
        category TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Execute table creation
    this.db.exec(createPortfolioTable)
    this.db.exec(createSkillsTable)

    // Create indexes for better performance
    this.createIndexes()
  }

  createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_portfolio_category ON portfolio(category)',
      'CREATE INDEX IF NOT EXISTS idx_portfolio_date ON portfolio(date)',
      'CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category)',
      'CREATE INDEX IF NOT EXISTS idx_skills_power ON skills(power)',
    ]

    indexes.forEach(indexQuery => {
      try {
        this.db.exec(indexQuery)
      } catch (error) {
        console.warn('Index creation warning:', error.message)
      }
    })
  }

  // Portfolio methods
  insertPortfolioItem(item) {
    const stmt = this.db.prepare(`
      INSERT INTO portfolio (name, img, site, date, category, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    return stmt.run(
      item.name,
      item.img,
      item.site || null,
      item.date,
      item.category,
      item.description || null
    )
  }

  getAllPortfolioItems() {
    const stmt = this.db.prepare('SELECT * FROM portfolio ORDER BY date DESC')
    return stmt.all()
  }

  getPortfolioItemsByCategory(category) {
    const stmt = this.db.prepare(
      'SELECT * FROM portfolio WHERE category = ? ORDER BY date DESC'
    )
    return stmt.all(category)
  }

  getPortfolioItemById(id) {
    const stmt = this.db.prepare('SELECT * FROM portfolio WHERE id = ?')
    return stmt.get(id)
  }

  // Skills methods
  insertSkill(skill) {
    const stmt = this.db.prepare(`
      INSERT INTO skills (name, power, category)
      VALUES (?, ?, ?)
    `)

    return stmt.run(skill.name, skill.power, skill.category)
  }

  getAllSkills() {
    const stmt = this.db.prepare(
      'SELECT * FROM skills ORDER BY category, power DESC'
    )
    return stmt.all()
  }

  getSkillsByCategory(category) {
    const stmt = this.db.prepare(
      'SELECT * FROM skills WHERE category = ? ORDER BY power DESC'
    )
    return stmt.all(category)
  }

  // Utility methods
  clearPortfolioTable() {
    this.db.exec('DELETE FROM portfolio')
  }

  clearSkillsTable() {
    this.db.exec('DELETE FROM skills')
  }

  getPortfolioCount() {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM portfolio')
    return stmt.get().count
  }

  getSkillsCount() {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM skills')
    return stmt.get().count
  }

  close() {
    if (this.db) {
      this.db.close()
    }
  }
}

export default DatabaseService

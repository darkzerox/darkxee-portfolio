import { MongoClient } from 'mongodb'

class MongoDBService {
  constructor(connectionString = null) {
    this.connectionString = connectionString || process.env.DATABASE_URL
    this.client = null
    this.db = null
    this.isConnectedFlag = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000 // Start with 1 second
    this.maxReconnectDelay = 30000 // Max 30 seconds
  }

  async init() {
    try {
      if (!this.connectionString) {
        throw new Error('DATABASE_URL environment variable is required')
      }

      console.log('Initializing MongoDB connection...')
      
      this.client = new MongoClient(this.connectionString, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxIdleTimeMS: 30000,
      })

      await this.client.connect()
      
      // Extract database name from connection string
      const dbName = this.extractDatabaseName(this.connectionString)
      this.db = this.client.db(dbName)
      
      this.isConnectedFlag = true
      this.reconnectAttempts = 0
      
      console.log('MongoDB connection initialized successfully')
      
      // Create indexes for performance
      await this.createIndexes()
      
      return true
    } catch (error) {
      console.error('Failed to initialize MongoDB connection:', error)
      this.isConnectedFlag = false
      throw error
    }
  }

  extractDatabaseName(connectionString) {
    try {
      // Extract database name from MongoDB connection string
      const url = new URL(connectionString)
      const dbName = url.pathname.substring(1) // Remove leading slash
      return dbName || 'portfolio'
    } catch (error) {
      console.warn('Could not extract database name from connection string, using default: portfolio')
      return 'portfolio'
    }
  }

  async close() {
    try {
      if (this.client) {
        await this.client.close()
        this.isConnectedFlag = false
        console.log('MongoDB connection closed')
      }
    } catch (error) {
      console.error('Error closing MongoDB connection:', error)
      throw error
    }
  }

  isConnected() {
    return this.isConnectedFlag && this.client && this.client.topology && this.client.topology.isConnected()
  }

  async healthCheck() {
    try {
      if (!this.isConnected()) {
        return { status: 'disconnected', error: 'Not connected to MongoDB' }
      }

      // Ping the database
      await this.db.admin().ping()
      
      return { 
        status: 'healthy', 
        database: this.db.databaseName,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('MongoDB health check failed:', error)
      return { 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new Error(`Max reconnection attempts (${this.maxReconnectAttempts}) exceeded`)
    }

    this.reconnectAttempts++
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    )

    console.log(`Attempting to reconnect to MongoDB (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`)
    
    await new Promise(resolve => setTimeout(resolve, delay))

    try {
      await this.close()
      await this.init()
      console.log('MongoDB reconnection successful')
      return true
    } catch (error) {
      console.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, error)
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        return await this.reconnect()
      } else {
        throw error
      }
    }
  }

  async ensureConnection() {
    if (!this.isConnected()) {
      console.log('Connection lost, attempting to reconnect...')
      await this.reconnect()
    }
  }

  async createIndexes() {
    try {
      const portfolioCollection = this.db.collection('portfolio')
      const skillsCollection = this.db.collection('skills')

      // Create indexes for portfolio collection
      await portfolioCollection.createIndex({ category: 1 })
      await portfolioCollection.createIndex({ date: -1 })
      await portfolioCollection.createIndex({ name: 1 })

      // Create indexes for skills collection
      await skillsCollection.createIndex({ category: 1 })
      await skillsCollection.createIndex({ power: -1 })
      await skillsCollection.createIndex({ name: 1 })

      console.log('Database indexes created successfully')
    } catch (error) {
      console.warn('Index creation warning:', error.message)
    }
  }

  // Portfolio CRUD operations
  async insertPortfolioItem(item) {
    try {
      await this.ensureConnection()
      
      const portfolioCollection = this.db.collection('portfolio')
      
      // Prepare the document with timestamps
      const document = {
        name: item.name,
        img: item.img,
        site: item.site || null,
        date: item.date,
        category: item.category,
        description: item.description || null,
        created_at: new Date(),
        updated_at: new Date()
      }

      const result = await portfolioCollection.insertOne(document)
      
      // Return result in similar format to SQLite (with insertedId as id)
      return {
        lastInsertRowid: result.insertedId,
        changes: 1
      }
    } catch (error) {
      console.error('Error inserting portfolio item:', error)
      throw new Error(`Failed to insert portfolio item: ${error.message}`)
    }
  }

  async getAllPortfolioItems() {
    try {
      await this.ensureConnection()
      
      const portfolioCollection = this.db.collection('portfolio')
      
      // Get all items sorted by date descending (newest first)
      const items = await portfolioCollection
        .find({})
        .sort({ date: -1 })
        .toArray()

      // Convert MongoDB _id to id for compatibility
      return items.map(item => ({
        id: item._id.toString(),
        name: item.name,
        img: item.img,
        site: item.site,
        date: item.date,
        category: item.category,
        description: item.description,
        created_at: item.created_at,
        updated_at: item.updated_at
      }))
    } catch (error) {
      console.error('Error getting all portfolio items:', error)
      throw new Error(`Failed to get portfolio items: ${error.message}`)
    }
  }

  async getPortfolioItemsByCategory(category) {
    try {
      await this.ensureConnection()
      
      const portfolioCollection = this.db.collection('portfolio')
      
      // Get items by category sorted by date descending
      const items = await portfolioCollection
        .find({ category })
        .sort({ date: -1 })
        .toArray()

      // Convert MongoDB _id to id for compatibility
      return items.map(item => ({
        id: item._id.toString(),
        name: item.name,
        img: item.img,
        site: item.site,
        date: item.date,
        category: item.category,
        description: item.description,
        created_at: item.created_at,
        updated_at: item.updated_at
      }))
    } catch (error) {
      console.error('Error getting portfolio items by category:', error)
      throw new Error(`Failed to get portfolio items by category: ${error.message}`)
    }
  }

  async getPortfolioItemById(id) {
    try {
      await this.ensureConnection()
      
      const portfolioCollection = this.db.collection('portfolio')
      
      // Import ObjectId for proper ID handling
      const { ObjectId } = await import('mongodb')
      
      let query
      try {
        // Try to use as ObjectId first
        query = { _id: new ObjectId(id) }
      } catch (error) {
        // If not a valid ObjectId, search by string id
        query = { _id: id }
      }

      const item = await portfolioCollection.findOne(query)
      
      if (!item) {
        return null
      }

      // Convert MongoDB _id to id for compatibility
      return {
        id: item._id.toString(),
        name: item.name,
        img: item.img,
        site: item.site,
        date: item.date,
        category: item.category,
        description: item.description,
        created_at: item.created_at,
        updated_at: item.updated_at
      }
    } catch (error) {
      console.error('Error getting portfolio item by ID:', error)
      throw new Error(`Failed to get portfolio item by ID: ${error.message}`)
    }
  }

  // Skills CRUD operations
  validateSkillData(skill) {
    const errors = []

    if (!skill.name || typeof skill.name !== 'string' || skill.name.trim() === '') {
      errors.push('Skill name is required and must be a non-empty string')
    }

    if (skill.power === undefined || skill.power === null) {
      errors.push('Skill power is required')
    } else if (typeof skill.power !== 'number' || !Number.isInteger(skill.power)) {
      errors.push('Skill power must be an integer')
    } else if (skill.power < 0 || skill.power > 100) {
      errors.push('Skill power must be between 0 and 100')
    }

    if (!skill.category || typeof skill.category !== 'string' || skill.category.trim() === '') {
      errors.push('Skill category is required and must be a non-empty string')
    }

    return errors
  }

  async insertSkill(skill) {
    try {
      await this.ensureConnection()

      // Validate skill data
      const validationErrors = this.validateSkillData(skill)
      if (validationErrors.length > 0) {
        const errorMessage = `Skill validation failed: ${validationErrors.join(', ')}`
        console.error(errorMessage)
        throw new Error(errorMessage)
      }
      
      const skillsCollection = this.db.collection('skills')
      
      // Prepare the document with timestamps
      const document = {
        name: skill.name.trim(),
        power: skill.power,
        category: skill.category.trim(),
        created_at: new Date(),
        updated_at: new Date()
      }

      const result = await skillsCollection.insertOne(document)
      
      // Return result in similar format to SQLite
      return {
        lastInsertRowid: result.insertedId,
        changes: 1
      }
    } catch (error) {
      console.error('Error inserting skill:', error)
      throw new Error(`Failed to insert skill: ${error.message}`)
    }
  }

  async getAllSkills() {
    try {
      await this.ensureConnection()
      
      const skillsCollection = this.db.collection('skills')
      
      // Get all skills sorted by category, then by power descending
      const skills = await skillsCollection
        .find({})
        .sort({ category: 1, power: -1 })
        .toArray()

      // Convert MongoDB _id to id for compatibility
      return skills.map(skill => ({
        id: skill._id.toString(),
        name: skill.name,
        power: skill.power,
        category: skill.category,
        created_at: skill.created_at,
        updated_at: skill.updated_at
      }))
    } catch (error) {
      console.error('Error getting all skills:', error)
      throw new Error(`Failed to get skills: ${error.message}`)
    }
  }

  async getSkillsByCategory(category) {
    try {
      await this.ensureConnection()
      
      const skillsCollection = this.db.collection('skills')
      
      // Get skills by category sorted by power descending
      const skills = await skillsCollection
        .find({ category })
        .sort({ power: -1 })
        .toArray()

      // Convert MongoDB _id to id for compatibility
      return skills.map(skill => ({
        id: skill._id.toString(),
        name: skill.name,
        power: skill.power,
        category: skill.category,
        created_at: skill.created_at,
        updated_at: skill.updated_at
      }))
    } catch (error) {
      console.error('Error getting skills by category:', error)
      throw new Error(`Failed to get skills by category: ${error.message}`)
    }
  }

  // Utility methods
  async clearPortfolioTable() {
    try {
      await this.ensureConnection()
      
      const portfolioCollection = this.db.collection('portfolio')
      const result = await portfolioCollection.deleteMany({})
      
      console.log(`Cleared ${result.deletedCount} portfolio items`)
      return result.deletedCount
    } catch (error) {
      console.error('Error clearing portfolio table:', error)
      throw new Error(`Failed to clear portfolio table: ${error.message}`)
    }
  }

  async clearSkillsTable() {
    try {
      await this.ensureConnection()
      
      const skillsCollection = this.db.collection('skills')
      const result = await skillsCollection.deleteMany({})
      
      console.log(`Cleared ${result.deletedCount} skills`)
      return result.deletedCount
    } catch (error) {
      console.error('Error clearing skills table:', error)
      throw new Error(`Failed to clear skills table: ${error.message}`)
    }
  }

  async getPortfolioCount() {
    try {
      await this.ensureConnection()
      
      const portfolioCollection = this.db.collection('portfolio')
      const count = await portfolioCollection.countDocuments()
      
      return count
    } catch (error) {
      console.error('Error getting portfolio count:', error)
      throw new Error(`Failed to get portfolio count: ${error.message}`)
    }
  }

  async getSkillsCount() {
    try {
      await this.ensureConnection()
      
      const skillsCollection = this.db.collection('skills')
      const count = await skillsCollection.countDocuments()
      
      return count
    } catch (error) {
      console.error('Error getting skills count:', error)
      throw new Error(`Failed to get skills count: ${error.message}`)
    }
  }

  // Database management methods
  async dropDatabase() {
    try {
      await this.ensureConnection()
      
      await this.db.dropDatabase()
      console.log('Database dropped successfully')
      return true
    } catch (error) {
      console.error('Error dropping database:', error)
      throw new Error(`Failed to drop database: ${error.message}`)
    }
  }

  async getCollectionStats() {
    try {
      await this.ensureConnection()
      
      const portfolioStats = await this.db.collection('portfolio').stats()
      const skillsStats = await this.db.collection('skills').stats()
      
      return {
        portfolio: {
          count: portfolioStats.count,
          size: portfolioStats.size,
          avgObjSize: portfolioStats.avgObjSize
        },
        skills: {
          count: skillsStats.count,
          size: skillsStats.size,
          avgObjSize: skillsStats.avgObjSize
        }
      }
    } catch (error) {
      console.error('Error getting collection stats:', error)
      throw new Error(`Failed to get collection stats: ${error.message}`)
    }
  }

  async optimizeDatabase() {
    try {
      await this.ensureConnection()
      
      // Recreate indexes to ensure optimal performance
      await this.createIndexes()
      
      // Compact collections if supported
      try {
        await this.db.command({ compact: 'portfolio' })
        await this.db.command({ compact: 'skills' })
        console.log('Database optimization completed')
      } catch (compactError) {
        console.warn('Compact operation not supported or failed:', compactError.message)
      }
      
      return true
    } catch (error) {
      console.error('Error optimizing database:', error)
      throw new Error(`Failed to optimize database: ${error.message}`)
    }
  }

  // Connection pooling and cleanup methods
  async getConnectionInfo() {
    try {
      if (!this.client) {
        return { status: 'no_client', connected: false }
      }

      const serverStatus = await this.db.admin().serverStatus()
      
      return {
        status: 'connected',
        connected: this.isConnected(),
        serverVersion: serverStatus.version,
        uptime: serverStatus.uptime,
        connections: serverStatus.connections,
        database: this.db.databaseName
      }
    } catch (error) {
      console.error('Error getting connection info:', error)
      return {
        status: 'error',
        connected: false,
        error: error.message
      }
    }
  }

  async cleanup() {
    try {
      // Close any open cursors or operations
      if (this.client && this.client.topology) {
        // Force close all connections
        await this.client.close(true)
      }
      
      this.isConnectedFlag = false
      this.client = null
      this.db = null
      
      console.log('MongoDB service cleanup completed')
      return true
    } catch (error) {
      console.error('Error during cleanup:', error)
      throw new Error(`Failed to cleanup MongoDB service: ${error.message}`)
    }
  }
}

export default MongoDBService
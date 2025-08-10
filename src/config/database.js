import MongoDBService from '../services/MongoDBService.js'

class DatabaseConnection {
  constructor() {
    this.service = null
    this.isInitialized = false
    this.connectionRetries = 0
    this.maxRetries = 5
    this.retryDelay = 2000 // Start with 2 seconds
    this.maxRetryDelay = 30000 // Max 30 seconds
    this.healthCheckInterval = null
    this.healthCheckIntervalMs = 30000 // 30 seconds
  }

  /**
   * Validate environment variables required for database connection
   */
  validateEnvironment() {
    const errors = []

    if (!process.env.DATABASE_URL) {
      errors.push('DATABASE_URL environment variable is required')
    } else {
      // Validate MongoDB connection string format
      try {
        const url = new URL(process.env.DATABASE_URL)
        if (!url.protocol.startsWith('mongodb')) {
          errors.push('DATABASE_URL must be a valid MongoDB connection string (mongodb:// or mongodb+srv://)')
        }
      } catch (error) {
        errors.push('DATABASE_URL must be a valid URL format')
      }
    }

    return errors
  }

  /**
   * Initialize database connection with retry logic
   */
  async connect() {
    const validationErrors = this.validateEnvironment()
    if (validationErrors.length > 0) {
      const errorMessage = `Environment validation failed: ${validationErrors.join(', ')}`
      console.error(errorMessage)
      throw new Error(errorMessage)
    }

    if (this.isInitialized && this.service && this.service.isConnected()) {
      console.log('Database connection already established')
      return this.service
    }

    let lastError = null

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Attempting database connection (${attempt}/${this.maxRetries})...`)
        
        this.service = new MongoDBService()
        await this.service.init()
        
        this.isInitialized = true
        this.connectionRetries = 0
        
        console.log('Database connection established successfully')
        
        // Start health monitoring
        this.startHealthMonitoring()
        
        return this.service
      } catch (error) {
        lastError = error
        console.error(`Connection attempt ${attempt} failed:`, error.message)
        
        if (attempt < this.maxRetries) {
          const delay = Math.min(
            this.retryDelay * Math.pow(2, attempt - 1),
            this.maxRetryDelay
          )
          console.log(`Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    const errorMessage = `Failed to establish database connection after ${this.maxRetries} attempts. Last error: ${lastError?.message}`
    console.error(errorMessage)
    throw new Error(errorMessage)
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    try {
      this.stopHealthMonitoring()
      
      if (this.service) {
        await this.service.close()
        console.log('Database connection closed successfully')
      }
      
      this.service = null
      this.isInitialized = false
      this.connectionRetries = 0
    } catch (error) {
      console.error('Error during database disconnect:', error)
      throw error
    }
  }

  /**
   * Get the database service instance
   */
  getClient() {
    if (!this.isInitialized || !this.service) {
      throw new Error('Database connection not initialized. Call connect() first.')
    }
    return this.service
  }

  /**
   * Check if database is connected
   */
  isConnected() {
    return this.isInitialized && this.service && this.service.isConnected()
  }

  /**
   * Reconnect to database with exponential backoff
   */
  async reconnect() {
    console.log('Attempting to reconnect to database...')
    
    try {
      if (this.service) {
        await this.service.close()
      }
    } catch (error) {
      console.warn('Error closing existing connection during reconnect:', error.message)
    }

    this.isInitialized = false
    this.service = null

    return await this.connect()
  }

  /**
   * Validate database connection
   */
  async validateConnection() {
    if (!this.service) {
      return { valid: false, error: 'No database service available' }
    }

    try {
      const healthStatus = await this.service.healthCheck()
      
      return {
        valid: healthStatus.status === 'healthy',
        status: healthStatus,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Connection validation failed:', error)
      return {
        valid: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      return // Already monitoring
    }

    console.log(`Starting database health monitoring (interval: ${this.healthCheckIntervalMs}ms)`)
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        const validation = await this.validateConnection()
        
        if (!validation.valid) {
          console.warn('Database health check failed:', validation.error)
          
          // Attempt automatic reconnection
          try {
            console.log('Attempting automatic reconnection...')
            await this.reconnect()
            console.log('Automatic reconnection successful')
          } catch (reconnectError) {
            console.error('Automatic reconnection failed:', reconnectError.message)
          }
        }
      } catch (error) {
        console.error('Health monitoring error:', error.message)
      }
    }, this.healthCheckIntervalMs)
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
      console.log('Database health monitoring stopped')
    }
  }

  /**
   * Get connection information
   */
  async getConnectionInfo() {
    if (!this.service) {
      return {
        connected: false,
        error: 'No database service available'
      }
    }

    try {
      const connectionInfo = await this.service.getConnectionInfo()
      return {
        connected: this.isConnected(),
        initialized: this.isInitialized,
        retries: this.connectionRetries,
        maxRetries: this.maxRetries,
        healthMonitoring: !!this.healthCheckInterval,
        ...connectionInfo
      }
    } catch (error) {
      return {
        connected: false,
        initialized: this.isInitialized,
        error: error.message
      }
    }
  }

  /**
   * Force cleanup of all resources
   */
  async cleanup() {
    try {
      this.stopHealthMonitoring()
      
      if (this.service) {
        await this.service.cleanup()
      }
      
      this.service = null
      this.isInitialized = false
      this.connectionRetries = 0
      
      console.log('Database connection cleanup completed')
    } catch (error) {
      console.error('Error during database cleanup:', error)
      throw error
    }
  }
}

// Create singleton instance
const databaseConnection = new DatabaseConnection()

export default databaseConnection
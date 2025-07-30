/**
 * API Client Service
 * Centralized service for handling API communication with error handling and caching
 */
export class ApiClient {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl
    this.cache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5 minutes
  }

  /**
   * Get all portfolio items with optional filtering
   * @param {Object} filters - Optional filters for portfolio items
   * @returns {Promise<Array>} Array of portfolio items
   */
  async getPortfolioItems(filters = {}) {
    const cacheKey = `portfolio_${JSON.stringify(filters)}`

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data
      }
    }

    try {
      const queryParams = new URLSearchParams(filters).toString()
      const url = `${this.baseUrl}/portfolio${queryParams ? `?${queryParams}` : ''}`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      })

      return data
    } catch (error) {
      return this.handleApiError(error, 'Failed to fetch portfolio items')
    }
  }

  /**
   * Get skills data with optional category filtering
   * @param {string|null} category - Optional category filter
   * @returns {Promise<Array>} Array of skills
   */
  async getSkills(category = null) {
    const cacheKey = `skills_${category || 'all'}`

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data
      }
    }

    try {
      const url = `${this.baseUrl}/skills${category ? `?category=${category}` : ''}`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      })

      return data
    } catch (error) {
      return this.handleApiError(error, 'Failed to fetch skills data')
    }
  }

  /**
   * Handle API errors with fallback data and user-friendly messages
   * @param {Error} error - The error object
   * @param {string} message - User-friendly error message
   * @returns {Array} Empty array as fallback
   */
  handleApiError(error, message) {
    console.error(message, error)

    // In development, show more detailed errors
    if (import.meta.env.DEV) {
      console.error('Detailed error:', error)
    }

    // Return empty array as fallback
    return []
  }

  /**
   * Clear the API cache
   */
  clearCache() {
    this.cache.clear()
  }
}

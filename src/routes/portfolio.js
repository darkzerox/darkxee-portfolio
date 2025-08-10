import express from 'express'

const router = express.Router()

// Input validation middleware
const validatePortfolioFilters = (req, res, next) => {
  const { category, limit, offset } = req.query

  // Validate category if provided
  if (category && typeof category !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid category parameter',
    })
  }

  // Validate limit if provided
  if (
    limit &&
    (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 100)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Limit must be a number between 1 and 100',
    })
  }

  // Validate offset if provided
  if (offset && (isNaN(parseInt(offset)) || parseInt(offset) < 0)) {
    return res.status(400).json({
      success: false,
      error: 'Offset must be a non-negative number',
    })
  }

  next()
}

// GET /api/portfolio - Get all portfolio items with optional filtering
router.get('/', validatePortfolioFilters, async (req, res) => {
  try {
    const { category, limit, offset } = req.query
    const dbService = req.dbService

    if (!dbService) {
      return res.status(500).json({
        success: false,
        error: 'Database service not available',
      })
    }

    // Check database connection
    if (!dbService.isConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database connection unavailable',
      })
    }

    let portfolioItems
    if (category && category !== 'All') {
      portfolioItems = await dbService.getPortfolioItemsByCategory(category)
    } else {
      portfolioItems = await dbService.getAllPortfolioItems()
    }

    // Apply pagination if specified
    const startIndex = offset ? parseInt(offset) : 0
    const endIndex = limit
      ? startIndex + parseInt(limit)
      : portfolioItems.length
    const paginatedItems = portfolioItems.slice(startIndex, endIndex)

    res.json({
      success: true,
      data: paginatedItems,
      count: paginatedItems.length,
      total: portfolioItems.length,
      pagination: {
        offset: startIndex,
        limit: limit ? parseInt(limit) : portfolioItems.length,
        hasMore: endIndex < portfolioItems.length,
      },
    })
  } catch (error) {
    console.error('Error fetching portfolio items:', error)
    
    // Handle MongoDB-specific errors
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
      return res.status(503).json({
        success: false,
        error: 'Database connection error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Service temporarily unavailable',
      })
    }
    
    if (error.name === 'MongoTimeoutError') {
      return res.status(504).json({
        success: false,
        error: 'Database timeout',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Request timeout',
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio items',
      message:
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'Internal server error',
    })
  }
})

// GET /api/portfolio/:id - Get individual portfolio item
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const dbService = req.dbService

    if (!dbService) {
      return res.status(500).json({
        success: false,
        error: 'Database service not available',
      })
    }

    // Check database connection
    if (!dbService.isConnected()) {
      return res.status(503).json({
        success: false,
        error: 'Database connection unavailable',
      })
    }

    // For MongoDB, we accept both ObjectId strings and legacy integer IDs
    if (!id || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Portfolio item ID is required',
      })
    }

    const portfolioItem = await dbService.getPortfolioItemById(id)

    if (!portfolioItem) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio item not found',
        id: id,
      })
    }

    res.json({
      success: true,
      data: portfolioItem,
    })
  } catch (error) {
    console.error('Error fetching portfolio item:', error)
    
    // Handle MongoDB-specific errors
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
      return res.status(503).json({
        success: false,
        error: 'Database connection error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Service temporarily unavailable',
      })
    }
    
    if (error.name === 'MongoTimeoutError') {
      return res.status(504).json({
        success: false,
        error: 'Database timeout',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Request timeout',
      })
    }
    
    // Handle invalid ObjectId errors
    if (error.message && error.message.includes('ObjectId')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid portfolio item ID format',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Invalid ID format',
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio item',
      message:
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'Internal server error',
    })
  }
})

export default router

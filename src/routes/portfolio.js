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

    let portfolioItems
    if (category && category !== 'All') {
      portfolioItems = dbService.getPortfolioItemsByCategory(category)
    } else {
      portfolioItems = dbService.getAllPortfolioItems()
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

    // Validate ID
    if (!id || isNaN(parseInt(id)) || parseInt(id) < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid portfolio item ID. ID must be a positive integer.',
      })
    }

    const portfolioId = parseInt(id)
    const portfolioItem = dbService.getPortfolioItemById(portfolioId)

    if (!portfolioItem) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio item not found',
        id: portfolioId,
      })
    }

    res.json({
      success: true,
      data: portfolioItem,
    })
  } catch (error) {
    console.error('Error fetching portfolio item:', error)
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

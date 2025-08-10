import express from 'express'

const router = express.Router()

// GET /api/skills - Get all skills with optional category filtering
router.get('/', async (req, res) => {
  try {
    const { category } = req.query
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

    let skills
    if (category) {
      skills = await dbService.getSkillsByCategory(category)
    } else {
      skills = await dbService.getAllSkills()
    }

    res.json({
      success: true,
      data: skills,
      count: skills.length,
    })
  } catch (error) {
    console.error('Error fetching skills:', error)
    
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
      error: 'Failed to fetch skills',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    })
  }
})

export default router

import express from 'express'

const router = express.Router()

// GET /api/skills - Get all skills with optional category filtering
router.get('/', async (req, res) => {
  try {
    const { category } = req.query
    const dbService = req.dbService

    let skills
    if (category) {
      skills = dbService.getSkillsByCategory(category)
    } else {
      skills = dbService.getAllSkills()
    }

    res.json({
      success: true,
      data: skills,
      count: skills.length,
    })
  } catch (error) {
    console.error('Error fetching skills:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch skills',
      message: error.message,
    })
  }
})

export default router

/**
 * Skills Component
 * Handles skills data fetching, rendering, and animations
 */
export class Skills {
  constructor(apiClient) {
    this.apiClient = apiClient
    this.skills = []
    this.container = null
  }

  /**
   * Initialize the skills component
   * @param {HTMLElement} container - The container element for the skills
   */
  async init(container) {
    this.container = container
    await this.loadSkillsData()
    this.renderSkillsByCategory(this.skills)
    this.animateProgressBars()
  }

  /**
   * Load skills data from API
   */
  async loadSkillsData() {
    try {
      this.skills = await this.apiClient.getSkills()
    } catch (error) {
      console.error('Failed to load skills data:', error)
      this.skills = []
    }
  }

  /**
   * Render skills organized by category
   * @param {Array} skills - Array of skill items to render
   */
  renderSkillsByCategory(skills) {
    if (!this.container) return

    // Handle data format - check if it's wrapped in API response format
    const skillsData = skills?.data || skills || []

    if (skillsData.length === 0) {
      this.container.innerHTML = `
        <div class="text-center py-12 text-gray-500">
          <p class="text-lg">No skills data available</p>
        </div>
      `
      return
    }

    // Group skills by category
    const categorizedSkills = this.groupSkillsByCategory(skillsData)

    // Clear container
    this.container.innerHTML = ''

    // Create description section
    const descriptionSection = document.createElement('div')
    descriptionSection.className = 'mb-8 text-center max-w-4xl mx-auto'
    descriptionSection.innerHTML = `
      <h3 class="text-2xl font-bold text-primary mb-4">Website Developer</h3>
      <p class="text-gray-300 leading-relaxed">
        เริ่มเข้าสู่วงการ Website Developer ตั้งแต่ปี 2558 เชี่ยวชาญการพัฒนาเว็บไซต์โดยใช้ Wordpress และ Woocommerce สามารถปรับปรุง Template Plugin และโครงสร้างพื้นฐาน SEO ตามที่ต้องการได้ รวมทั้งยังสามารถดูแลระบบ Web Server ตั้งค่า Domain DNS CDN Https ได้อย่างมีประสิทธิภาพ
      </p>
    `
    this.container.appendChild(descriptionSection)

    // Create skills grid
    const skillsGrid = document.createElement('div')
    skillsGrid.className =
      'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8'

    // Render each category in custom order
    const categoryOrder = this.getCategoryOrder()
    const availableCategories = Object.keys(categorizedSkills)
    
    // First render categories in the defined order
    categoryOrder.forEach(category => {
      if (categorizedSkills[category]) {
        const categorySection = this.createCategorySection(
          category,
          categorizedSkills[category]
        )
        skillsGrid.appendChild(categorySection)
      }
    })
    
    // Then render any remaining categories not in the defined order
    availableCategories.forEach(category => {
      if (!categoryOrder.includes(category)) {
        const categorySection = this.createCategorySection(
          category,
          categorizedSkills[category]
        )
        skillsGrid.appendChild(categorySection)
      }
    })

    this.container.appendChild(skillsGrid)

    // Create WordPress section
    const wordpressSection = document.createElement('div')
    wordpressSection.className = 'mt-16 max-w-4xl mx-auto'
    wordpressSection.innerHTML = `
      <div class="bg-white rounded-lg shadow-lg p-8 border border-gray-100">
        <h3 class="text-2xl font-bold text-primary mb-6 text-center">WordPress Expertise</h3>
        <div class="space-y-4 text-gray-700 leading-relaxed">
          <p>• ติดตั้งระบบ wordpress ได้อย่างมีประสิทธิภาพ</p>
          <p>• เขียน Template หรือปรับแต่ง Template ที่มีอยู่ให้ใช้งานได้ตามความต้องการ</p>
          <p>• เขียน plugin ได้</p>
          <p>• ติดตั้ง Webserver (Linux DigitalOcean, Apache, Nginx)</p>
          <p>• ติดตั้งระบบร้านค้า (Woocommerce) พร้อมตั้งค่าต่างๆเพื่อให้ครอบคลุมการใช้งานได้อย่างมีประสิทธิภาพ</p>
          <p>• ทำระบบ Backup</p>
          <p>• ทำระบบ CDN พร้อม Https (Cloudflare)</p>
        </div>
        <div class="mt-6 pt-6 border-t border-gray-200">
          <p class="text-sm text-gray-600 italic">
            ทักษะข้างล่างนี้ เป็นการประเมินความสามารถในการสร้างเว็บไซต์ได้อย่างมีประสิทธิภาพ พร้อมใช้งานได้ 
            ไม่รวมถึงการสร้างเว็บไซต์ขนาดใหญ่ที่มีข้อมูลและความซับซ้อนของระบบอันมหาศาล
          </p>
        </div>
      </div>
    `
    this.container.appendChild(wordpressSection)
  }

  /**
   * Animate progress bars on hover and scroll
   */
  animateProgressBars() {
    // Use setTimeout to ensure DOM elements are ready
    setTimeout(() => {
      const progressBars = this.container.querySelectorAll('.skill-progress')

      // Create intersection observer for scroll animations
      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const progressBar = entry.target
              const power = progressBar.dataset.power

              // Animate the progress bar
              setTimeout(
                () => {
                  progressBar.style.width = `${power}%`
                },
                parseInt(progressBar.style.animationDelay) || 0
              )

              // Stop observing this element
              observer.unobserve(progressBar)
            }
          })
        },
        { threshold: 0.1 }
      )

      // Start observing all progress bars
      progressBars.forEach(bar => {
        observer.observe(bar)
      })

      // Add hover animations to skill items
      const skillItems = this.container.querySelectorAll('.skill-item')
      skillItems.forEach(item => {
        const progressBar = item.querySelector('.skill-progress')

        item.addEventListener('mouseenter', () => {
          progressBar.style.transform = 'scaleY(1.2)'
          progressBar.classList.add('shadow-lg')
        })

        item.addEventListener('mouseleave', () => {
          progressBar.style.transform = 'scaleY(1)'
          progressBar.classList.remove('shadow-lg')
        })
      })
    }, 100)
  }

  /**
   * Get the custom order for categories
   * @returns {Array} Array of category names in desired order
   */
  getCategoryOrder() {
    return [
      'ai & automation',
      'frontend',
      'backend',
      'database',
      'server',
      'design'
    ]
  }

  /**
   * Group skills by category
   * @param {Array} skills - Array of skill objects
   * @returns {Object} Skills grouped by category
   */
  groupSkillsByCategory(skills) {
    const grouped = {}

    skills.forEach(skill => {
      // Handle both 'cate' and 'category' field names for legacy compatibility
      const category = skill.category || skill.cate || 'other'
      const categoryKey = category.toLowerCase()

      if (!grouped[categoryKey]) {
        grouped[categoryKey] = []
      }

      grouped[categoryKey].push(skill)
    })

    // Sort skills within each category by power (descending)
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => (b.power || 0) - (a.power || 0))
    })

    return grouped
  }

  /**
   * Create a category section with skills
   * @param {string} category - Category name
   * @param {Array} skills - Skills in this category
   * @returns {HTMLElement} Category section element
   */
  createCategorySection(category, skills) {
    const section = document.createElement('div')
    section.className = 'bg-white rounded-lg shadow-md p-6 animate-fade-in'

    // Create category header
    const header = document.createElement('h3')
    header.className =
      'text-lg font-semibold text-secondary mb-4 pb-2 border-b border-gray-200'
    header.textContent = this.formatCategoryName(category)

    section.appendChild(header)

    // Create skills container
    const skillsContainer = document.createElement('div')
    skillsContainer.className = 'space-y-4'

    // Add each skill
    skills.forEach((skill, index) => {
      const skillElement = this.createSkillBar(skill, index)
      skillsContainer.appendChild(skillElement)
    })

    section.appendChild(skillsContainer)
    return section
  }

  /**
   * Format category name for display
   * @param {string} category - Raw category name
   * @returns {string} Formatted category name
   */
  formatCategoryName(category) {
    const categoryMap = {
      ai: 'AI & Automation',
      frontend: 'Frontend',
      backend: 'Backend',
      database: 'Database',
      design: 'Design',
      server: 'Server',
      other: 'Other',
    }

    return (
      categoryMap[category.toLowerCase()] ||
      category.charAt(0).toUpperCase() + category.slice(1)
    )
  }

  /**
   * Create a single skill bar element
   * @param {Object} skill - Skill object with name, power, and category
   * @param {number} index - Index for animation delay
   * @returns {HTMLElement} Skill bar element
   */
  createSkillBar(skill, index = 0) {
    const skillContainer = document.createElement('div')
    skillContainer.className = 'skill-item'

    const power = Math.max(0, Math.min(100, skill.power || 0)) // Ensure power is between 0-100

    skillContainer.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm font-medium text-gray-700">${skill.name || 'Unknown Skill'}</span>
        <span class="text-xs text-gray-500">${power}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          class="skill-progress bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-1000 ease-out"
          data-power="${power}"
          style="width: 0%; animation-delay: ${index * 150}ms;"
        ></div>
      </div>
    `

    return skillContainer
  }

  /**
   * Generate HTML for a single skill bar (legacy method - kept for compatibility)
   * @param {Object} skill - Skill object with name, power, and category
   * @returns {string} HTML string for skill bar
   */
  generateSkillBar(skill) {
    const power = Math.max(0, Math.min(100, skill.power || 0))

    return `
      <div class="skill-item mb-4">
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm font-medium text-gray-700">${skill.name || 'Unknown Skill'}</span>
          <span class="text-xs text-gray-500">${power}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div 
            class="skill-progress bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-1000 ease-out"
            data-power="${power}"
            style="width: 0%;"
          ></div>
        </div>
      </div>
    `
  }
}

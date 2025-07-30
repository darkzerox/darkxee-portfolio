/**
 * Portfolio Component
 * Handles portfolio data fetching, rendering, and filtering functionality
 */
export class Portfolio {
  constructor(apiClient) {
    this.apiClient = apiClient
    this.portfolioItems = []
    this.currentFilter = 'all'
    this.container = null
  }

  /**
   * Initialize the portfolio component
   * @param {HTMLElement} container - The container element for the portfolio
   */
  async init(container) {
    this.container = container
    await this.loadPortfolioData()
    this.setupFilterButtons()
    this.renderPortfolioGrid(this.portfolioItems)
  }

  /**
   * Load portfolio data from API
   */
  async loadPortfolioData() {
    try {
      this.portfolioItems = await this.apiClient.getPortfolioItems()
    } catch (error) {
      console.error('Failed to load portfolio data:', error)
      this.portfolioItems = []
    }
  }

  /**
   * Render portfolio grid with current items
   * @param {Array} portfolioItems - Array of portfolio items to render
   */
  renderPortfolioGrid(portfolioItems) {
    if (!this.container) return

    // Get or create portfolio container
    let portfolioContainer = this.container.querySelector('#portfolio-grid')
    if (!portfolioContainer) {
      portfolioContainer = document.createElement('div')
      portfolioContainer.id = 'portfolio-grid'
      portfolioContainer.className =
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8'
      this.container.appendChild(portfolioContainer)
    }

    // Clear existing content
    portfolioContainer.innerHTML = ''

    // Handle data format - check if it's wrapped in API response format
    const items = portfolioItems?.data || portfolioItems || []

    if (items.length === 0) {
      portfolioContainer.innerHTML = `
        <div class="col-span-full text-center py-12 text-gray-500">
          <p class="text-lg">No portfolio items found</p>
        </div>
      `
      return
    }

    // Render each portfolio item
    items.forEach(item => {
      const portfolioCard = this.createPortfolioCard(item)
      portfolioContainer.appendChild(portfolioCard)
    })
  }

  /**
   * Create a portfolio card element
   * @param {Object} item - Portfolio item data
   * @returns {HTMLElement} Portfolio card element
   */
  createPortfolioCard(item) {
    const card = document.createElement('div')
    card.className =
      'bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer animate-fade-in'
    card.dataset.category = item.category || 'other'

    // Handle image path - check if it's already a full path or needs asset prefix
    const imagePath =
      item.img?.startsWith('/') || item.img?.startsWith('http')
        ? item.img
        : `/asset/img/portfolio/${item.img}`

    card.innerHTML = `
      <div class="relative overflow-hidden">
        <img 
          src="${imagePath}" 
          alt="${item.name || 'Portfolio item'}"
          class="w-full h-48 object-cover transition-transform duration-300 hover:scale-105"
          loading="lazy"
        />
        <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
          <div class="text-white opacity-0 hover:opacity-100 transition-opacity duration-300">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
          </div>
        </div>
      </div>
      <div class="p-4">
        <h3 class="text-lg font-semibold text-gray-800 mb-2">${item.name || 'Untitled'}</h3>
        <p class="text-sm text-gray-600 mb-2">${item.description || item.desc || 'No description available'}</p>
        <div class="flex justify-between items-center">
          <span class="text-xs text-primary font-medium px-2 py-1 bg-primary/10 rounded">${item.category || 'Other'}</span>
          <span class="text-xs text-gray-500">${item.date || 'No date'}</span>
        </div>
      </div>
    `

    // Add click handler for modal
    card.addEventListener('click', () => {
      this.showPortfolioModal(item)
    })

    return card
  }

  /**
   * Set up filter button event handlers
   */
  setupFilterButtons() {
    if (!this.container) return

    // Get or create filter container
    let filterContainer = this.container.querySelector('#portfolio-filters')
    if (!filterContainer) {
      filterContainer = document.createElement('div')
      filterContainer.id = 'portfolio-filters'
      filterContainer.className = 'flex flex-wrap justify-center gap-2 mt-4'

      // Insert before portfolio grid
      const portfolioGrid = this.container.querySelector('#portfolio-grid')
      if (portfolioGrid) {
        this.container.insertBefore(filterContainer, portfolioGrid)
      } else {
        this.container.appendChild(filterContainer)
      }
    }

    // Get unique categories from portfolio items
    const items = this.portfolioItems?.data || this.portfolioItems || []
    const categories = [
      'all',
      ...new Set(items.map(item => item.category || 'other')),
    ]

    // Clear existing filters
    filterContainer.innerHTML = ''

    // Create filter buttons
    categories.forEach(category => {
      const button = document.createElement('button')
      button.className = `px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
        category === this.currentFilter
          ? 'bg-primary text-white shadow-md'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`
      button.textContent = category.charAt(0).toUpperCase() + category.slice(1)
      button.dataset.filter = category

      button.addEventListener('click', e => {
        this.filterPortfolio(category)
        this.updateActiveFilter(e.target)
      })

      filterContainer.appendChild(button)
    })
  }

  /**
   * Filter portfolio items by category
   * @param {string} category - Category to filter by ('all' for no filter)
   */
  filterPortfolio(category) {
    this.currentFilter = category
    const items = this.portfolioItems?.data || this.portfolioItems || []

    const filteredItems =
      category === 'all'
        ? items
        : items.filter(item => (item.category || 'other') === category)

    this.renderPortfolioGrid(filteredItems)
  }

  /**
   * Update active filter button styling
   * @param {HTMLElement} activeButton - The clicked filter button
   */
  updateActiveFilter(activeButton) {
    // Remove active class from all buttons
    const filterContainer = this.container.querySelector('#portfolio-filters')
    if (filterContainer) {
      filterContainer.querySelectorAll('button').forEach(btn => {
        btn.className =
          'px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 bg-gray-200 text-gray-700 hover:bg-gray-300'
      })

      // Add active class to clicked button
      activeButton.className =
        'px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 bg-primary text-white shadow-md'
    }
  }

  /**
   * Show portfolio modal with item details
   * @param {Object} portfolioItem - Portfolio item to display in modal
   */
  showPortfolioModal(portfolioItem) {
    // Remove existing modal if present
    const existingModal = document.querySelector('#portfolio-modal')
    if (existingModal) {
      existingModal.remove()
    }

    // Create modal element
    const modal = document.createElement('div')
    modal.id = 'portfolio-modal'
    modal.className =
      'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'

    // Handle image path
    const imagePath =
      portfolioItem.img?.startsWith('/') ||
      portfolioItem.img?.startsWith('http')
        ? portfolioItem.img
        : `/asset/img/portfolio/${portfolioItem.img}`

    modal.innerHTML = `
      <div class="bg-white rounded-lg max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div class="relative">
          <img 
            src="${imagePath}" 
            alt="${portfolioItem.name || 'Portfolio item'}"
            class="w-full h-64 object-cover"
          />
          <button 
            id="close-modal" 
            class="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-70 transition-all duration-200"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="p-6">
          <h2 class="text-2xl font-bold text-gray-800 mb-3">${portfolioItem.name || 'Untitled'}</h2>
          <div class="flex flex-wrap gap-2 mb-4">
            <span class="text-sm text-primary font-medium px-3 py-1 bg-primary/10 rounded-full">${portfolioItem.category || 'Other'}</span>
            <span class="text-sm text-gray-500 px-3 py-1 bg-gray-100 rounded-full">${portfolioItem.date || 'No date'}</span>
          </div>
          <p class="text-gray-600 mb-6 leading-relaxed">${portfolioItem.description || portfolioItem.desc || 'No description available'}</p>
          ${
            portfolioItem.site
              ? `
            <div class="flex gap-3">
              <a 
                href="${portfolioItem.site}" 
                target="_blank" 
                rel="noopener noreferrer"
                class="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
                Visit Site
              </a>
            </div>
          `
              : ''
          }
        </div>
      </div>
    `

    // Add modal to document
    document.body.appendChild(modal)

    // Add event listeners
    const closeButton = modal.querySelector('#close-modal')
    const modalContent = modal.querySelector('div > div')

    const closeModal = () => {
      // Restore body scroll before removing modal
      document.body.style.overflow = 'auto'
      modal.remove()
    }

    closeButton.addEventListener('click', closeModal)

    // Close modal when clicking outside content
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        closeModal()
      }
    })

    // Close modal with escape key
    const handleKeyPress = e => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleKeyPress)
        closeModal()
      }
    }
    document.addEventListener('keydown', handleKeyPress)

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'
  }
}

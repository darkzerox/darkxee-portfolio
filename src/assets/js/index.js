/**
 * Main application entry point
 * Initializes all components and handles application lifecycle
 */
import { Navigation } from '../../components/Navigation.js'
import { Portfolio } from '../../components/Portfolio.js'
import { Skills } from '../../components/Skills.js'
import { ApiClient } from '../../services/ApiClient.js'

class App {
  constructor() {
    this.apiClient = new ApiClient()
    this.navigation = new Navigation()
    this.portfolio = new Portfolio(this.apiClient)
    this.skills = new Skills(this.apiClient)
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      // Initialize navigation
      this.navigation.init()

      // Initialize portfolio component
      const portfolioContainer = document.getElementById('portfolio')
      if (portfolioContainer) {
        await this.portfolio.init(portfolioContainer)
      }

      // Initialize skills component
      const skillsContainer = document.getElementById('skills')
      if (skillsContainer) {
        await this.skills.init(skillsContainer)
      }

      console.log('Application initialized successfully')
    } catch (error) {
      console.error('Failed to initialize application:', error)
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new App()
  app.init()
})

export default App

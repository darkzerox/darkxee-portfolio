/**
 * Main Application Entry Point
 * Initializes all components and handles application bootstrapping
 */

import './assets/css/main.css'
import { ApiClient } from './services/ApiClient.js'
import { Portfolio } from './components/Portfolio.js'
import { Skills } from './components/Skills.js'
import { Navigation } from './components/Navigation.js'

/**
 * Application class for managing component lifecycle
 */
class App {
  constructor() {
    this.apiClient = new ApiClient()
    this.navigation = new Navigation()
    this.portfolio = null
    this.skills = null
    this.isInitialized = false
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      // Show loading state
      this.showLoadingState()

      // Initialize navigation first (doesn't depend on API)
      this.navigation.init()

      // Initialize components that depend on API data
      await this.initializeComponents()

      // Hide loading state
      this.hideLoadingState()

      this.isInitialized = true
      console.log('Application initialized successfully')
    } catch (error) {
      console.error('Failed to initialize application:', error)
      this.showErrorState(error)
    }
  }

  /**
   * Initialize components that require API data
   */
  async initializeComponents() {
    // Initialize Portfolio component
    const portfolioSection = document.querySelector('#portfolio .container-max')
    if (portfolioSection) {
      this.portfolio = new Portfolio(this.apiClient)
      await this.portfolio.init(portfolioSection)
    }

    // Initialize Skills component
    const skillsSection = document.querySelector('#skills .container-max')
    if (skillsSection) {
      this.skills = new Skills(this.apiClient)
      await this.skills.init(skillsSection)
    }
  }

  /**
   * Show loading state across the application
   */
  showLoadingState() {
    // Add loading overlay
    const loadingOverlay = document.createElement('div')
    loadingOverlay.id = 'app-loading'
    loadingOverlay.className =
      'fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50'
    loadingOverlay.innerHTML = `
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p class="text-gray-600">Loading portfolio...</p>
      </div>
    `
    document.body.appendChild(loadingOverlay)

    // Add loading state to individual sections
    const portfolioSection = document.querySelector('#portfolio .container-max')
    const skillsSection = document.querySelector('#skills .container-max')

    if (portfolioSection) {
      portfolioSection.innerHTML +=
        '<div class="section-loading text-center py-8 text-gray-500">Loading portfolio items...</div>'
    }

    if (skillsSection) {
      skillsSection.innerHTML +=
        '<div class="section-loading text-center py-8 text-gray-500">Loading skills data...</div>'
    }
  }

  /**
   * Hide loading state
   */
  hideLoadingState() {
    // Remove main loading overlay
    const loadingOverlay = document.getElementById('app-loading')
    if (loadingOverlay) {
      loadingOverlay.remove()
    }

    // Remove section loading states
    const sectionLoadings = document.querySelectorAll('.section-loading')
    sectionLoadings.forEach(loading => loading.remove())
  }

  /**
   * Show error state if initialization fails
   * @param {Error} error - The error that occurred
   */
  showErrorState(error) {
    // Hide loading state first
    this.hideLoadingState()

    // Show error message
    const errorOverlay = document.createElement('div')
    errorOverlay.id = 'app-error'
    errorOverlay.className =
      'fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50'
    errorOverlay.innerHTML = `
      <div class="text-center max-w-md mx-auto p-6">
        <div class="text-red-500 mb-4">
          <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-800 mb-2">Failed to Load Portfolio</h2>
        <p class="text-gray-600 mb-4">There was an error loading the portfolio data. Please try refreshing the page.</p>
        <button id="retry-button" class="btn-primary">Try Again</button>
      </div>
    `

    document.body.appendChild(errorOverlay)

    // Add retry functionality
    const retryButton = document.getElementById('retry-button')
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        errorOverlay.remove()
        this.init()
      })
    }
  }

  /**
   * Handle application errors gracefully
   * @param {Error} error - The error to handle
   */
  handleError(error) {
    console.error('Application error:', error)

    // In development, show detailed errors
    if (import.meta.env.DEV) {
      console.error('Detailed error:', error)
    }

    // Show user-friendly error message
    const errorToast = document.createElement('div')
    errorToast.className =
      'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up'
    errorToast.innerHTML = `
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>Something went wrong. Please try again.</span>
      </div>
    `

    document.body.appendChild(errorToast)

    // Auto-remove error toast after 5 seconds
    setTimeout(() => {
      if (errorToast.parentNode) {
        errorToast.remove()
      }
    }, 5000)
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App()

  // Set up global error handler
  window.addEventListener('error', event => {
    app.handleError(event.error)
  })

  // Set up unhandled promise rejection handler
  window.addEventListener('unhandledrejection', event => {
    app.handleError(event.reason)
  })

  // Initialize the app
  app.init()
})

// Export for potential external use
export { App }

/**
 * Navigation Component
 * Handles smooth scrolling navigation and mobile menu functionality
 */
export class Navigation {
  constructor() {
    this.mobileMenuOpen = false
    this.activeSection = 'skills'
  }

  /**
   * Initialize the navigation component
   */
  init() {
    this.setupSmoothScrolling()
    this.setupMobileMenu()
    this.setupActiveStateTracking()
  }

  /**
   * Set up smooth scrolling for navigation links
   */
  setupSmoothScrolling() {
    const navLinks = document.querySelectorAll('.nav-link')

    navLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault()

        const targetId = link.getAttribute('href').substring(1)
        const targetSection = document.getElementById(targetId)

        if (targetSection) {
          // Close mobile menu if open
          if (this.mobileMenuOpen) {
            this.closeMobileMenu()
          }

          // Smooth scroll to target
          const navHeight = document.getElementById('navigation').offsetHeight
          const targetPosition = targetSection.offsetTop - navHeight

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth',
          })

          // Update active state
          this.updateActiveState(targetId)
        }
      })
    })
  }

  /**
   * Set up mobile menu toggle functionality
   */
  setupMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle')
    const mobileMenu = document.getElementById('mobile-menu')
    const hamburgerIcon = document.getElementById('hamburger-icon')
    const closeIcon = document.getElementById('close-icon')

    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener('click', () => {
        this.toggleMobileMenu()
      })
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', e => {
      if (
        this.mobileMenuOpen &&
        !mobileMenuToggle.contains(e.target) &&
        !mobileMenu.contains(e.target)
      ) {
        this.closeMobileMenu()
      }
    })

    // Close mobile menu on window resize to desktop size
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768 && this.mobileMenuOpen) {
        this.closeMobileMenu()
      }
    })
  }

  /**
   * Toggle mobile menu visibility
   */
  toggleMobileMenu() {
    if (this.mobileMenuOpen) {
      this.closeMobileMenu()
    } else {
      this.openMobileMenu()
    }
  }

  /**
   * Open mobile menu
   */
  openMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu')
    const hamburgerIcon = document.getElementById('hamburger-icon')
    const closeIcon = document.getElementById('close-icon')

    this.mobileMenuOpen = true
    mobileMenu.classList.remove('hidden')
    hamburgerIcon.classList.add('hidden')
    closeIcon.classList.remove('hidden')

    // Animate menu items
    const menuItems = mobileMenu.querySelectorAll('.mobile-nav-link')
    menuItems.forEach((item, index) => {
      item.style.opacity = '0'
      item.style.transform = 'translateY(-10px)'

      setTimeout(() => {
        item.style.transition = 'all 0.3s ease-out'
        item.style.opacity = '1'
        item.style.transform = 'translateY(0)'
      }, index * 50)
    })
  }

  /**
   * Close mobile menu
   */
  closeMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu')
    const hamburgerIcon = document.getElementById('hamburger-icon')
    const closeIcon = document.getElementById('close-icon')

    this.mobileMenuOpen = false
    mobileMenu.classList.add('hidden')
    hamburgerIcon.classList.remove('hidden')
    closeIcon.classList.add('hidden')
  }

  /**
   * Set up active section highlighting
   */
  setupActiveStateTracking() {
    // Create intersection observer for section tracking
    const sections = document.querySelectorAll('section[id]')
    const navHeight = document.getElementById('navigation').offsetHeight

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.updateActiveState(entry.target.id)
          }
        })
      },
      {
        rootMargin: `-${navHeight}px 0px -60% 0px`,
        threshold: 0.1,
      }
    )

    // Start observing all sections
    sections.forEach(section => {
      observer.observe(section)
    })

    // Also track scroll for navbar transparency effect
    let lastScrollY = window.scrollY

    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY
      const navigation = document.getElementById('navigation')

      if (currentScrollY > 100) {
        navigation.classList.add('bg-white/95', 'backdrop-blur-sm')
        navigation.classList.remove('bg-white')
      } else {
        navigation.classList.add('bg-white')
        navigation.classList.remove('bg-white/95', 'backdrop-blur-sm')
      }

      // Hide/show navbar on scroll
      if (currentScrollY > lastScrollY && currentScrollY > 200) {
        navigation.style.transform = 'translateY(-100%)'
      } else {
        navigation.style.transform = 'translateY(0)'
      }

      lastScrollY = currentScrollY
    })
  }

  /**
   * Update active navigation state
   * @param {string} sectionId - ID of the currently active section
   */
  updateActiveState(sectionId) {
    if (this.activeSection === sectionId) return

    this.activeSection = sectionId

    // Update nav link classes
    const navLinks = document.querySelectorAll('.nav-link')
    navLinks.forEach(link => {
      const linkSection = link.getAttribute('data-section')

      if (linkSection === sectionId) {
        link.classList.add('text-primary', 'font-semibold')
        link.classList.remove('text-gray-700')
      } else {
        link.classList.add('text-gray-700')
        link.classList.remove('text-primary', 'font-semibold')
      }
    })
  }
}

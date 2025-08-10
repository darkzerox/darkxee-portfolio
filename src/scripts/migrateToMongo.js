import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'
import MongoDBService from '../services/MongoDBService.js'

// Load environment variables
config()

class DataMigrator {
  constructor() {
    this.mongoService = null
    this.migrationReport = {
      startTime: null,
      endTime: null,
      portfolioMigrated: 0,
      skillsMigrated: 0,
      errors: [],
      warnings: [],
      dataSources: []
    }
  }

  /**
   * Detect available data sources (SQLite database, JSON files)
   * Requirements: 4.1, 4.2
   */
  async detectDataSources() {
    console.log('🔍 Detecting available data sources...')
    const sources = {
      portfolioJson: false,
      skillsJson: false
    }

    // SQLite support has been removed after migration completion
    console.log('ℹ️  SQLite support removed - using JSON files only')

    // Check for JSON backup files
    const portfolioJsonPath = path.join(process.cwd(), 'asset', 'database', 'portfolio.json')
    if (fs.existsSync(portfolioJsonPath)) {
      try {
        const portfolioData = JSON.parse(fs.readFileSync(portfolioJsonPath, 'utf-8'))
        sources.portfolioJson = true
        this.migrationReport.dataSources.push({
          type: 'Portfolio JSON',
          path: portfolioJsonPath,
          records: portfolioData.length
        })
        console.log(`✅ Portfolio JSON found: ${portfolioData.length} records`)
      } catch (error) {
        console.warn(`⚠️  Portfolio JSON exists but is not readable: ${error.message}`)
        this.migrationReport.warnings.push(`Portfolio JSON not readable: ${error.message}`)
      }
    } else {
      console.log('❌ Portfolio JSON not found')
    }

    const skillsJsonPath = path.join(process.cwd(), 'asset', 'database', 'skill.json')
    if (fs.existsSync(skillsJsonPath)) {
      try {
        const skillsData = JSON.parse(fs.readFileSync(skillsJsonPath, 'utf-8'))
        sources.skillsJson = true
        this.migrationReport.dataSources.push({
          type: 'Skills JSON',
          path: skillsJsonPath,
          records: skillsData.length
        })
        console.log(`✅ Skills JSON found: ${skillsData.length} records`)
      } catch (error) {
        console.warn(`⚠️  Skills JSON exists but is not readable: ${error.message}`)
        this.migrationReport.warnings.push(`Skills JSON not readable: ${error.message}`)
      }
    } else {
      console.log('❌ Skills JSON not found')
    }

    return sources
  }

  // SQLite methods removed after migration completion

  /**
   * Read portfolio data from JSON file
   * Requirements: 4.2
   */
  async readPortfolioFromJSON() {
    const portfolioJsonPath = path.join(process.cwd(), 'asset', 'database', 'portfolio.json')
    
    try {
      const content = fs.readFileSync(portfolioJsonPath, 'utf-8')
      const portfolioData = JSON.parse(content)
      console.log(`📖 Read ${portfolioData.length} portfolio items from JSON`)
      return portfolioData
    } catch (error) {
      console.error('❌ Failed to read portfolio data from JSON:', error.message)
      this.migrationReport.errors.push(`JSON portfolio read error: ${error.message}`)
      throw error
    }
  }

  /**
   * Read skills data from JSON file
   * Requirements: 4.2
   */
  async readSkillsFromJSON() {
    const skillsJsonPath = path.join(process.cwd(), 'asset', 'database', 'skill.json')
    
    try {
      const content = fs.readFileSync(skillsJsonPath, 'utf-8')
      const skillsData = JSON.parse(content)
      console.log(`📖 Read ${skillsData.length} skills from JSON`)
      return skillsData
    } catch (error) {
      console.error('❌ Failed to read skills data from JSON:', error.message)
      this.migrationReport.errors.push(`JSON skills read error: ${error.message}`)
      throw error
    }
  }

  /**
   * Get portfolio data from JSON source
   * Requirements: 4.2
   */
  async getPortfolioData(sources) {
    if (sources.portfolioJson) {
      return await this.readPortfolioFromJSON()
    }

    throw new Error('No portfolio data source available')
  }

  /**
   * Get skills data from JSON source
   * Requirements: 4.2
   */
  async getSkillsData(sources) {
    if (sources.skillsJson) {
      return await this.readSkillsFromJSON()
    }

    throw new Error('No skills data source available')
  }

  /**
   * Clean up database connections
   */
  async cleanup() {
    if (this.mongoService) {
      await this.mongoService.close()
      this.mongoService = null
    }
  }

  /**
   * Validate and transform portfolio data
   * Requirements: 4.3, 4.4
   */
  validateAndTransformPortfolio(portfolioData) {
    console.log('🔍 Validating and transforming portfolio data...')
    const validatedData = []
    const errors = []

    portfolioData.forEach((item, index) => {
      try {
        // Create a copy to avoid mutating original data
        const transformedItem = { ...item }

        // Fix common typos and field name inconsistencies
        if (transformedItem.cateogry) {
          transformedItem.category = transformedItem.cateogry
          delete transformedItem.cateogry
        }
        if (transformedItem.desc) {
          transformedItem.description = transformedItem.desc
          delete transformedItem.desc
        }

        // Validate required fields
        if (!transformedItem.name || typeof transformedItem.name !== 'string') {
          throw new Error('Missing or invalid name field')
        }
        if (!transformedItem.img || typeof transformedItem.img !== 'string') {
          throw new Error('Missing or invalid img field')
        }
        if (!transformedItem.date || typeof transformedItem.date !== 'string') {
          throw new Error('Missing or invalid date field')
        }
        if (!transformedItem.category || typeof transformedItem.category !== 'string') {
          throw new Error('Missing or invalid category field')
        }

        // Normalize category values
        const categoryMap = {
          'Profile': 'Profile',
          'Blog': 'Blog', 
          'Ecommerce': 'Ecommerce',
          'Property': 'Property',
          'Webapp': 'Webapp'
        }
        
        if (!categoryMap[transformedItem.category]) {
          console.warn(`⚠️  Unknown category "${transformedItem.category}" for item "${transformedItem.name}", keeping as-is`)
          this.migrationReport.warnings.push(`Unknown portfolio category: ${transformedItem.category}`)
        }

        // Ensure optional fields are properly handled
        transformedItem.site = transformedItem.site || null
        transformedItem.description = transformedItem.description || null

        // Trim whitespace from string fields
        transformedItem.name = transformedItem.name.trim()
        transformedItem.img = transformedItem.img.trim()
        transformedItem.date = transformedItem.date.trim()
        transformedItem.category = transformedItem.category.trim()
        if (transformedItem.site) {
          transformedItem.site = transformedItem.site.trim()
        }
        if (transformedItem.description) {
          transformedItem.description = transformedItem.description.trim()
        }

        validatedData.push(transformedItem)
      } catch (error) {
        const errorMsg = `Portfolio item ${index}: ${error.message}`
        errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    })

    if (errors.length > 0) {
      this.migrationReport.errors.push(...errors)
    }

    console.log(`✅ Validated ${validatedData.length} portfolio items (${errors.length} errors)`)
    return validatedData
  }

  /**
   * Validate and transform skills data
   * Requirements: 4.3, 4.4
   */
  validateAndTransformSkills(skillsData) {
    console.log('🔍 Validating and transforming skills data...')
    const validatedData = []
    const errors = []

    skillsData.forEach((item, index) => {
      try {
        // Create a copy to avoid mutating original data
        const transformedItem = { ...item }

        // Fix common typos and field name inconsistencies
        if (transformedItem.cate) {
          transformedItem.category = transformedItem.cate
          delete transformedItem.cate
        }

        // Validate required fields
        if (!transformedItem.name || typeof transformedItem.name !== 'string') {
          throw new Error('Missing or invalid name field')
        }
        if (transformedItem.power === undefined || transformedItem.power === null) {
          throw new Error('Missing power field')
        }
        if (!transformedItem.category || typeof transformedItem.category !== 'string') {
          throw new Error('Missing or invalid category field')
        }

        // Validate and normalize power value
        const power = parseInt(transformedItem.power)
        if (isNaN(power) || power < 0 || power > 100) {
          throw new Error(`Invalid power value: ${transformedItem.power}. Must be between 0-100`)
        }
        transformedItem.power = power

        // Normalize category values
        const categoryMap = {
          'frontend': 'frontend',
          'backend': 'backend',
          'database': 'database',
          'server': 'server',
          'design': 'design',
          'ai & automation': 'ai & automation'
        }

        const normalizedCategory = transformedItem.category.toLowerCase()
        if (!categoryMap[normalizedCategory]) {
          console.warn(`⚠️  Unknown category "${transformedItem.category}" for skill "${transformedItem.name}", keeping as-is`)
          this.migrationReport.warnings.push(`Unknown skill category: ${transformedItem.category}`)
        } else {
          transformedItem.category = categoryMap[normalizedCategory]
        }

        // Trim whitespace from string fields
        transformedItem.name = transformedItem.name.trim()
        transformedItem.category = transformedItem.category.trim()

        validatedData.push(transformedItem)
      } catch (error) {
        const errorMsg = `Skills item ${index}: ${error.message}`
        errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    })

    if (errors.length > 0) {
      this.migrationReport.errors.push(...errors)
    }

    console.log(`✅ Validated ${validatedData.length} skills (${errors.length} errors)`)
    return validatedData
  }

  /**
   * Validate data integrity before migration
   * Requirements: 4.4
   */
  validateDataIntegrity(portfolioData, skillsData) {
    console.log('🔍 Performing data integrity checks...')
    
    // Check for duplicate portfolio items
    const portfolioNames = new Set()
    const duplicatePortfolio = []
    portfolioData.forEach(item => {
      if (portfolioNames.has(item.name)) {
        duplicatePortfolio.push(item.name)
      } else {
        portfolioNames.add(item.name)
      }
    })

    if (duplicatePortfolio.length > 0) {
      console.warn(`⚠️  Found ${duplicatePortfolio.length} duplicate portfolio items:`, duplicatePortfolio)
      this.migrationReport.warnings.push(`Duplicate portfolio items: ${duplicatePortfolio.join(', ')}`)
    }

    // Check for duplicate skills
    const skillNames = new Set()
    const duplicateSkills = []
    skillsData.forEach(item => {
      if (skillNames.has(item.name)) {
        duplicateSkills.push(item.name)
      } else {
        skillNames.add(item.name)
      }
    })

    if (duplicateSkills.length > 0) {
      console.warn(`⚠️  Found ${duplicateSkills.length} duplicate skills:`, duplicateSkills)
      this.migrationReport.warnings.push(`Duplicate skills: ${duplicateSkills.join(', ')}`)
    }

    // Summary
    console.log(`✅ Data integrity check complete:`)
    console.log(`   - Portfolio items: ${portfolioData.length} (${duplicatePortfolio.length} duplicates)`)
    console.log(`   - Skills: ${skillsData.length} (${duplicateSkills.length} duplicates)`)

    return {
      portfolioValid: portfolioData.length > 0,
      skillsValid: skillsData.length > 0,
      duplicatePortfolio,
      duplicateSkills
    }
  }

  /**
   * Initialize MongoDB service
   */
  async initializeMongoService() {
    if (!this.mongoService) {
      this.mongoService = new MongoDBService()
      await this.mongoService.init()
    }
  }

  /**
   * Migrate portfolio data in batches with progress tracking
   * Requirements: 4.4, 4.5
   */
  async migratePortfolioBatch(portfolioData, batchSize = 10) {
    console.log(`📦 Starting portfolio migration in batches of ${batchSize}...`)
    
    await this.initializeMongoService()
    
    const totalItems = portfolioData.length
    let migratedCount = 0
    const errors = []

    for (let i = 0; i < totalItems; i += batchSize) {
      const batch = portfolioData.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(totalItems / batchSize)
      
      console.log(`📦 Processing portfolio batch ${batchNumber}/${totalBatches} (${batch.length} items)...`)
      
      try {
        for (const item of batch) {
          try {
            await this.mongoService.insertPortfolioItem(item)
            migratedCount++
            
            // Progress indicator
            const progress = Math.round((migratedCount / totalItems) * 100)
            process.stdout.write(`\r   Progress: ${migratedCount}/${totalItems} (${progress}%) `)
          } catch (error) {
            const errorMsg = `Failed to insert portfolio item "${item.name}": ${error.message}`
            errors.push(errorMsg)
            console.error(`\n❌ ${errorMsg}`)
          }
        }
        
        // Small delay between batches to avoid overwhelming the database
        if (i + batchSize < totalItems) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
      } catch (error) {
        const errorMsg = `Batch ${batchNumber} failed: ${error.message}`
        errors.push(errorMsg)
        console.error(`\n❌ ${errorMsg}`)
      }
    }

    console.log(`\n✅ Portfolio migration completed: ${migratedCount}/${totalItems} items migrated`)
    
    if (errors.length > 0) {
      this.migrationReport.errors.push(...errors)
      console.error(`❌ ${errors.length} portfolio migration errors occurred`)
    }

    this.migrationReport.portfolioMigrated = migratedCount
    return { migrated: migratedCount, errors }
  }

  /**
   * Migrate skills data in batches with progress tracking
   * Requirements: 4.4, 4.5
   */
  async migrateSkillsBatch(skillsData, batchSize = 10) {
    console.log(`📦 Starting skills migration in batches of ${batchSize}...`)
    
    await this.initializeMongoService()
    
    const totalItems = skillsData.length
    let migratedCount = 0
    const errors = []

    for (let i = 0; i < totalItems; i += batchSize) {
      const batch = skillsData.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(totalItems / batchSize)
      
      console.log(`📦 Processing skills batch ${batchNumber}/${totalBatches} (${batch.length} items)...`)
      
      try {
        for (const item of batch) {
          try {
            await this.mongoService.insertSkill(item)
            migratedCount++
            
            // Progress indicator
            const progress = Math.round((migratedCount / totalItems) * 100)
            process.stdout.write(`\r   Progress: ${migratedCount}/${totalItems} (${progress}%) `)
          } catch (error) {
            const errorMsg = `Failed to insert skill "${item.name}": ${error.message}`
            errors.push(errorMsg)
            console.error(`\n❌ ${errorMsg}`)
          }
        }
        
        // Small delay between batches to avoid overwhelming the database
        if (i + batchSize < totalItems) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
      } catch (error) {
        const errorMsg = `Batch ${batchNumber} failed: ${error.message}`
        errors.push(errorMsg)
        console.error(`\n❌ ${errorMsg}`)
      }
    }

    console.log(`\n✅ Skills migration completed: ${migratedCount}/${totalItems} items migrated`)
    
    if (errors.length > 0) {
      this.migrationReport.errors.push(...errors)
      console.error(`❌ ${errors.length} skills migration errors occurred`)
    }

    this.migrationReport.skillsMigrated = migratedCount
    return { migrated: migratedCount, errors }
  }

  /**
   * Rollback migration by clearing MongoDB collections
   * Requirements: 1.4
   */
  async rollbackMigration() {
    console.log('🔄 Rolling back migration...')
    
    try {
      await this.initializeMongoService()
      
      // Clear both collections
      await this.mongoService.clearPortfolioTable()
      await this.mongoService.clearSkillsTable()
      
      console.log('✅ Migration rollback completed - all data cleared from MongoDB')
      
      // Update migration report
      this.migrationReport.errors.push('Migration rolled back - all data cleared')
      
      return true
    } catch (error) {
      console.error('❌ Rollback failed:', error.message)
      this.migrationReport.errors.push(`Rollback failed: ${error.message}`)
      return false
    }
  }

  /**
   * Generate comprehensive migration summary report
   * Requirements: 4.5
   */
  generateMigrationReport() {
    const report = {
      ...this.migrationReport,
      endTime: new Date(),
      duration: this.migrationReport.startTime ? 
        new Date() - this.migrationReport.startTime : 0,
      success: this.migrationReport.errors.length === 0
    }

if (process.env.NODE_ENV !== 'test') {
  console.log('\n📊 MIGRATION SUMMARY REPORT')
  console.log('='.repeat(50))
  console.log(`Start Time: ${report.startTime?.toISOString() || 'N/A'}`)
  console.log(`End Time: ${report.endTime.toISOString()}`)
  console.log(`Duration: ${Math.round(report.duration / 1000)}s`)
  console.log(`Status: ${report.success ? '✅ SUCCESS' : '❌ FAILED'}`)
  console.log('')
  
  console.log('📈 DATA SOURCES:')
  report.dataSources.forEach(source => {
    if (source.type === 'SQLite') {
      console.log(`  - ${source.type}: ${source.portfolioRecords} portfolio, ${source.skillsRecords} skills`)
    } else {
      console.log(`  - ${source.type}: ${source.records} records`)
    }
  })
  console.log('')
  
  console.log('📊 MIGRATION RESULTS:')
  console.log(`  - Portfolio items migrated: ${report.portfolioMigrated}`)
  console.log(`  - Skills migrated: ${report.skillsMigrated}`)
  console.log(`  - Total records migrated: ${report.portfolioMigrated + report.skillsMigrated}`)
  console.log('')
  
  if (report.warnings.length > 0) {
    console.log(`⚠️  WARNINGS (${report.warnings.length}):`)
    report.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`)
    })
    console.log('')
  }
  
  if (report.errors.length > 0) {
    console.log(`❌ ERRORS (${report.errors.length}):`)
    report.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`)
    })
    console.log('')
  }
  
  console.log('='.repeat(50))
  
  // Save report to file
  const reportPath = path.join(process.cwd(), 'migration-report.json')
  try {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`📄 Detailed report saved to: ${reportPath}`)
  } catch (error) {
    console.warn(`⚠️  Could not save report file: ${error.message}`)
  }
} else {
  // In test environment, avoid console logging to prevent Jest "Cannot log after tests are done" errors.
  // Still attempt to save the report file (silently).
  const reportPath = path.join(process.cwd(), 'migration-report.json')
  try {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  } catch (error) {
    // ignore write errors in test environment
  }
}

return report
  }

  /**
   * Main migration method that orchestrates the entire process
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 1.4
   */
  async migrate(options = {}) {
    const {
      batchSize = 10,
      skipValidation = false,
      rollbackOnError = true
    } = options

    this.migrationReport.startTime = new Date()
    console.log('🚀 Starting MongoDB migration process...')
    console.log(`Options: batchSize=${batchSize}, skipValidation=${skipValidation}, rollbackOnError=${rollbackOnError}`)
    console.log('')

    try {
      // Step 1: Detect data sources
      const sources = await this.detectDataSources()
      
      if (!sources.portfolioJson && !sources.skillsJson) {
        throw new Error('No data sources available for migration')
      }

      // Step 2: Read data from sources
      console.log('\n📖 Reading data from sources...')
      const portfolioData = await this.getPortfolioData(sources)
      const skillsData = await this.getSkillsData(sources)

      // Step 3: Validate and transform data
      if (!skipValidation) {
        console.log('\n🔍 Validating and transforming data...')
        const validatedPortfolio = this.validateAndTransformPortfolio(portfolioData)
        const validatedSkills = this.validateAndTransformSkills(skillsData)
        
        // Data integrity check
        const integrityCheck = this.validateDataIntegrity(validatedPortfolio, validatedSkills)
        
        if (!integrityCheck.portfolioValid && !integrityCheck.skillsValid) {
          throw new Error('No valid data found after validation')
        }

        // Step 4: Migrate data in batches
        console.log('\n📦 Starting batch migration...')
        
        if (integrityCheck.portfolioValid) {
          await this.migratePortfolioBatch(validatedPortfolio, batchSize)
        }
        
        if (integrityCheck.skillsValid) {
          await this.migrateSkillsBatch(validatedSkills, batchSize)
        }
      } else {
        console.log('\n⚠️  Skipping validation - migrating raw data')
        await this.migratePortfolioBatch(portfolioData, batchSize)
        await this.migrateSkillsBatch(skillsData, batchSize)
      }

      // Step 5: Generate report
      const report = this.generateMigrationReport()
      
      if (report.errors.length > 0 && rollbackOnError) {
        console.log('\n🔄 Errors detected - initiating rollback...')
        await this.rollbackMigration()
        throw new Error(`Migration failed with ${report.errors.length} errors - rollback completed`)
      }

      console.log('\n🎉 Migration completed successfully!')
      return report

    } catch (error) {
      console.error('\n💥 Migration failed:', error.message)
      this.migrationReport.errors.push(`Migration failed: ${error.message}`)
      
      if (rollbackOnError) {
        console.log('\n🔄 Attempting rollback...')
        await this.rollbackMigration()
      }
      
      const report = this.generateMigrationReport()
      throw error
    } finally {
      await this.cleanup()
    }
  }
}

// Main execution function
async function main() {
  const migrator = new DataMigrator()
  
  try {
    // Parse command line arguments
    const args = process.argv.slice(2)
    const options = {}
    
    if (args.includes('--batch-size')) {
      const batchIndex = args.indexOf('--batch-size')
      options.batchSize = parseInt(args[batchIndex + 1]) || 10
    }
    
    if (args.includes('--skip-validation')) {
      options.skipValidation = true
    }
    
    if (args.includes('--no-rollback')) {
      options.rollbackOnError = false
    }
    
    if (args.includes('--rollback-only')) {
      console.log('🔄 Performing rollback only...')
      await migrator.rollbackMigration()
      return
    }

    // Run migration
    await migrator.migrate(options)
    
  } catch (error) {
    console.error('💥 Migration process failed:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error)
    process.exit(1)
  })
}

export default DataMigrator

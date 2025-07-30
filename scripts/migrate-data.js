import { readFileSync } from 'fs';
import { join } from 'path';
import DatabaseService from '../src/services/DatabaseService.js';

class DataMigration {
  constructor() {
    this.db = new DatabaseService();
  }

  async migratePortfolioData() {
    try {
      console.log('Starting portfolio data migration...');
      
      // Read portfolio JSON file
      const portfolioPath = join(process.cwd(), 'asset/database/portfolio.json');
      const portfolioData = JSON.parse(readFileSync(portfolioPath, 'utf8'));
      
      // Clear existing data
      this.db.clearPortfolioTable();
      
      let successCount = 0;
      let errorCount = 0;
      
      // Migrate each portfolio item
      for (const item of portfolioData) {
        try {
          // Fix the typo in category field (cateogry -> category)
          const normalizedItem = {
            name: item.name,
            img: item.img,
            site: item.site || null,
            date: item.date,
            category: item.cateogry || item.category, // Handle both spellings
            description: item.desc || item.description || null
          };
          
          this.db.insertPortfolioItem(normalizedItem);
          successCount++;
          console.log(`✓ Migrated portfolio item: ${normalizedItem.name}`);
        } catch (error) {
          errorCount++;
          console.error(`✗ Failed to migrate portfolio item: ${item.name}`, error.message);
        }
      }
      
      console.log(`Portfolio migration completed: ${successCount} success, ${errorCount} errors`);
      return { success: successCount, errors: errorCount };
    } catch (error) {
      console.error('Portfolio migration failed:', error);
      throw error;
    }
  }

  async migrateSkillsData() {
    try {
      console.log('Starting skills data migration...');
      
      // Read skills JSON file
      const skillsPath = join(process.cwd(), 'asset/database/skill.json');
      const skillsData = JSON.parse(readFileSync(skillsPath, 'utf8'));
      
      // Clear existing data
      this.db.clearSkillsTable();
      
      let successCount = 0;
      let errorCount = 0;
      
      // Migrate each skill item
      for (const skill of skillsData) {
        try {
          const normalizedSkill = {
            name: skill.name,
            power: skill.power,
            category: skill.cate || skill.category // Handle both field names
          };
          
          // Validate power range
          if (normalizedSkill.power < 0 || normalizedSkill.power > 100) {
            throw new Error(`Invalid power value: ${normalizedSkill.power}`);
          }
          
          this.db.insertSkill(normalizedSkill);
          successCount++;
          console.log(`✓ Migrated skill: ${normalizedSkill.name} (${normalizedSkill.category})`);
        } catch (error) {
          errorCount++;
          console.error(`✗ Failed to migrate skill: ${skill.name}`, error.message);
        }
      }
      
      console.log(`Skills migration completed: ${successCount} success, ${errorCount} errors`);
      return { success: successCount, errors: errorCount };
    } catch (error) {
      console.error('Skills migration failed:', error);
      throw error;
    }
  }

  async validateMigration() {
    console.log('Validating migration...');
    
    const portfolioCount = this.db.getPortfolioCount();
    const skillsCount = this.db.getSkillsCount();
    
    console.log(`Database contains ${portfolioCount} portfolio items and ${skillsCount} skills`);
    
    // Test queries
    console.log('Testing portfolio queries...');
    const portfolioItems = this.db.getAllPortfolioItems();
    console.log(`✓ Retrieved ${portfolioItems.length} portfolio items`);
    
    const ecommerceItems = this.db.getPortfolioItemsByCategory('Ecommerce');
    console.log(`✓ Retrieved ${ecommerceItems.length} ecommerce portfolio items`);
    
    console.log('Testing skills queries...');
    const skills = this.db.getAllSkills();
    console.log(`✓ Retrieved ${skills.length} skills`);
    
    const frontendSkills = this.db.getSkillsByCategory('frontend');
    console.log(`✓ Retrieved ${frontendSkills.length} frontend skills`);
    
    return {
      portfolioCount,
      skillsCount,
      portfolioItems: portfolioItems.length,
      skills: skills.length
    };
  }

  async run() {
    try {
      console.log('=== Starting Data Migration ===');
      
      const portfolioResult = await this.migratePortfolioData();
      const skillsResult = await this.migrateSkillsData();
      const validation = await this.validateMigration();
      
      console.log('=== Migration Summary ===');
      console.log(`Portfolio: ${portfolioResult.success} migrated, ${portfolioResult.errors} errors`);
      console.log(`Skills: ${skillsResult.success} migrated, ${skillsResult.errors} errors`);
      console.log(`Database validation: ${validation.portfolioCount} portfolio items, ${validation.skillsCount} skills`);
      
      this.db.close();
      console.log('Migration completed successfully!');
      
    } catch (error) {
      console.error('Migration failed:', error);
      this.db.close();
      process.exit(1);
    }
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migration = new DataMigration();
  migration.run();
}

export default DataMigration;
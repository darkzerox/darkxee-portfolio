# MongoDB Migration Design Document

## Overview

This design outlines the migration of the portfolio application from SQLite (better-sqlite3) to MongoDB. The migration involves updating the Prisma schema, creating a new MongoDB-based database service, migrating existing data, and updating all application code to use the new database system. The design ensures data integrity, maintains API compatibility, and provides a clean transition path.

## Architecture

### Current Architecture
- **Database Layer**: SQLite with better-sqlite3 driver
- **Service Layer**: DatabaseService.js (SQLite) and MockDatabaseService.js (JSON fallback)
- **ORM Layer**: Partially configured Prisma (already pointing to MongoDB)
- **API Layer**: Express routes using database service through middleware

### Target Architecture
- **Database Layer**: MongoDB with native MongoDB driver
- **Service Layer**: MongoDBService.js (unified MongoDB service)
- **ORM Layer**: Prisma with complete MongoDB schema
- **API Layer**: Same Express routes with updated service integration

### Migration Strategy
1. **Schema-First Approach**: Complete Prisma schema for MongoDB
2. **Service Replacement**: Replace DatabaseService with MongoDBService
3. **Data Migration**: Migrate existing SQLite/JSON data to MongoDB
4. **Code Updates**: Update all imports and service usage
5. **Cleanup**: Remove legacy SQLite dependencies

## Components and Interfaces

### 1. Prisma Schema Updates

**File**: `prisma/schema.prisma`

The schema needs to be updated to properly define MongoDB models:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

model Portfolio {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  img         String
  site        String?
  date        String   // Keep as String to match existing data format
  category    String
  description String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("portfolio")
}

model Skills {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  name      String
  power     Int      @db.Int
  category  String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("skills")
}
```

### 2. MongoDB Database Service

**File**: `src/services/MongoDBService.js`

A new service that provides the same interface as the current DatabaseService but uses MongoDB. This design decision ensures backward compatibility and minimizes code changes in the application layer (Requirement 3.1, 5.4).

```javascript
class MongoDBService {
  constructor(connectionString = null)
  async init()
  async close()
  
  // Portfolio methods
  async insertPortfolioItem(item)
  async getAllPortfolioItems()
  async getPortfolioItemsByCategory(category)
  async getPortfolioItemById(id)
  
  // Skills methods
  async insertSkill(skill)
  async getAllSkills()
  async getSkillsByCategory(category)
  
  // Utility methods
  async clearPortfolioTable()
  async clearSkillsTable()
  async getPortfolioCount()
  async getSkillsCount()
  
  // Connection management
  async reconnect()
  isConnected()
  async healthCheck()
}
```

**Design Rationale**: The service maintains the same method signatures as DatabaseService to ensure seamless replacement without breaking existing API endpoints. Additional connection management methods support automatic reconnection requirements (Requirement 7.3).

### 3. Data Migration Script

**File**: `src/scripts/migrateToMongo.js` (Updated)

Enhanced migration script that handles multiple data sources and provides comprehensive migration capabilities (Requirements 4.1, 4.2, 4.5):

```javascript
class DataMigrator {
  async migrateFromSQLite()
  async migrateFromJSON()
  async validateData(data, type)
  async cleanupData(data, type)
  async insertBatch(data, type)
  async generateMigrationReport()
  async rollbackMigration()
  async detectDataSources()
}
```

**Design Rationale**: The migration script prioritizes SQLite data when available, falls back to JSON files, and includes rollback capabilities to meet failure handling requirements (Requirement 1.4). Data validation ensures integrity before insertion (Requirement 4.4).

### 4. Connection Management

**File**: `src/config/database.js`

Centralized database connection configuration that addresses connection reliability requirements (Requirements 3.4, 7.1, 7.3):

```javascript
class DatabaseConnection {
  static async connect()
  static async disconnect()
  static getClient()
  static isConnected()
  static async reconnect()
  static async validateConnection()
}
```

**Design Rationale**: Centralized connection management ensures consistent connection handling across the application and supports automatic reconnection capabilities required by Requirement 7.3.

## Data Models

### Portfolio Document Structure
```javascript
{
  _id: ObjectId,
  name: String,
  img: String,
  site: String | null,
  date: String, // Format: "YYYY" or "YYYY-YYYY"
  category: String, // "Profile", "Blog", "Ecommerce", "Property", "Webapp"
  description: String | null,
  created_at: Date,
  updated_at: Date
}
```

### Skills Document Structure
```javascript
{
  _id: ObjectId,
  name: String,
  power: Number, // 0-100
  category: String, // "frontend", "backend", "database", "server", "design", "ai & automation"
  created_at: Date,
  updated_at: Date
}
```

### Data Transformation Rules

1. **Portfolio Data**:
   - Fix typo: `cateogry` → `category`
   - Normalize category values
   - Convert `desc` → `description`
   - Ensure date format consistency

2. **Skills Data**:
   - Fix typo: `cate` → `category`
   - Validate power range (0-100)
   - Normalize category names

## Error Handling

### Connection Errors
- **MongoDB Connection Failure**: Retry with exponential backoff
- **Authentication Errors**: Clear error messages with configuration guidance
- **Network Timeouts**: Configurable timeout settings with fallback

### Data Migration Errors
- **Data Validation Failures**: Log invalid records and continue with valid ones
- **Duplicate Key Errors**: Skip duplicates and log warnings
- **Schema Mismatches**: Transform data to match expected schema

### Runtime Errors
- **Query Failures**: Return appropriate HTTP status codes
- **Connection Loss**: Automatic reconnection with circuit breaker pattern
- **Resource Exhaustion**: Graceful degradation and error reporting

## Testing Strategy

### Unit Tests
- **MongoDBService Methods**: Test all CRUD operations
- **Data Validation**: Test data transformation and validation logic
- **Error Handling**: Test error scenarios and recovery

### Integration Tests
- **API Endpoints**: Test all routes with MongoDB backend
- **Data Migration**: Test migration with sample data
- **Connection Management**: Test connection lifecycle

### Migration Testing
- **Data Integrity**: Verify all data migrates correctly
- **Performance**: Ensure acceptable migration time
- **Rollback**: Test ability to revert if needed

### Test Data Setup
```javascript
// Test portfolio items
const testPortfolio = [
  {
    name: "Test Project",
    img: "test.jpg",
    site: "https://test.com",
    date: "2024",
    category: "Profile",
    description: "Test description"
  }
];

// Test skills
const testSkills = [
  {
    name: "JavaScript",
    power: 85,
    category: "frontend"
  }
];
```

## Performance Considerations

### Database Optimization
- **Indexes**: Create indexes on frequently queried fields (category, date, power)
- **Connection Pooling**: Use MongoDB connection pooling for better performance
- **Query Optimization**: Use MongoDB aggregation pipeline for complex queries

### Migration Performance
- **Batch Processing**: Process data in batches to avoid memory issues
- **Progress Tracking**: Provide migration progress feedback
- **Parallel Processing**: Migrate portfolio and skills data concurrently

### Runtime Performance
- **Caching**: Implement query result caching where appropriate
- **Pagination**: Maintain existing pagination for large datasets
- **Connection Reuse**: Reuse database connections across requests

## Security Considerations

### Connection Security
- **TLS/SSL**: Ensure encrypted connections to MongoDB
- **Authentication**: Use strong authentication credentials
- **Network Security**: Restrict database access to application servers only

### Data Security
- **Input Validation**: Validate all data before database operations
- **SQL Injection Prevention**: Use parameterized queries (MongoDB is naturally protected)
- **Access Control**: Implement proper database user permissions

## Deployment Strategy

### Development Environment
1. Update Prisma schema
2. Generate Prisma client
3. Implement MongoDBService
4. Run migration script
5. Update application code
6. Test thoroughly

### Production Environment
1. **Pre-deployment**: Backup existing SQLite database
2. **Migration Window**: Schedule maintenance window for migration
3. **Data Migration**: Run migration script with monitoring
4. **Verification**: Verify data integrity and application functionality
5. **Rollback Plan**: Keep SQLite backup for emergency rollback

### Rollback Strategy
- Keep SQLite database files as backup
- Maintain ability to switch back to DatabaseService
- Document rollback procedures
- Test rollback process in staging environment
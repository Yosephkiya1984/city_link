# Requirements Document

## Introduction

This feature involves conducting a comprehensive review of the live CityLink Supabase database schema against the application codebase to identify inconsistencies, missing elements, security gaps, and optimization opportunities. The review will use the Supabase MCP server to examine the actual deployed database structure, compare it with TypeScript types and service layer code, and ensure that the database properly supports all application features while following best practices for a production super-app serving multiple user roles (citizens, merchants, delivery agents, admins).

## Requirements

### Requirement 1

**User Story:** As a developer, I want to identify schema inconsistencies between the database and TypeScript types, so that I can ensure type safety and prevent runtime errors.

#### Acceptance Criteria

1. WHEN connecting to the live Supabase database via MCP THEN the system SHALL retrieve actual table schemas, column definitions, and constraints
2. WHEN comparing live database tables to TypeScript types THEN the system SHALL flag missing columns, incorrect data types, and naming mismatches
3. WHEN analyzing nullable fields THEN the system SHALL verify that optional TypeScript properties align with nullable database columns in the live schema
4. IF enum types exist in TypeScript THEN the system SHALL verify corresponding database constraints or enum types exist in the deployed database
5. WHEN reviewing foreign key relationships THEN the system SHALL ensure TypeScript interfaces properly reflect actual database relationships from the live schema

### Requirement 2

**User Story:** As a database administrator, I want to identify missing database constraints and indexes, so that I can ensure data integrity and optimal query performance.

#### Acceptance Criteria

1. WHEN analyzing service layer queries THEN the system SHALL identify frequently queried columns that lack indexes
2. WHEN reviewing business logic THEN the system SHALL identify missing unique constraints, check constraints, and foreign key constraints
3. WHEN examining user roles and permissions THEN the system SHALL verify appropriate database-level security constraints exist
4. IF composite queries are found THEN the system SHALL recommend composite indexes for performance optimization
5. WHEN analyzing data relationships THEN the system SHALL ensure referential integrity is properly enforced

### Requirement 3

**User Story:** As a security engineer, I want to review Row Level Security (RLS) policies against application access patterns, so that I can ensure proper data isolation and authorization.

#### Acceptance Criteria

1. WHEN reviewing service layer database calls THEN the system SHALL identify all data access patterns by user role
2. WHEN analyzing RLS policies THEN the system SHALL verify policies exist for all sensitive tables
3. WHEN examining multi-tenant data THEN the system SHALL ensure proper tenant isolation through RLS
4. IF admin functions exist THEN the system SHALL verify admin-only access is properly secured at the database level
5. WHEN reviewing authentication flows THEN the system SHALL ensure user context is properly validated in RLS policies

### Requirement 4

**User Story:** As a backend developer, I want to identify unused database functions and tables, so that I can clean up technical debt and improve maintainability.

#### Acceptance Criteria

1. WHEN scanning service layer code THEN the system SHALL identify all referenced database tables, functions, and views
2. WHEN comparing database objects to code references THEN the system SHALL flag unused database objects
3. WHEN analyzing RPC function calls THEN the system SHALL verify all database functions are properly utilized
4. IF deprecated code patterns exist THEN the system SHALL identify corresponding database objects that can be removed
5. WHEN reviewing migration history THEN the system SHALL identify objects created but never used in application code

### Requirement 5

**User Story:** As a product manager, I want to identify missing database support for application features, so that I can ensure all user stories are properly backed by data persistence.

#### Acceptance Criteria

1. WHEN reviewing application screens and components THEN the system SHALL identify all data requirements
2. WHEN analyzing service layer operations THEN the system SHALL verify database tables support all CRUD operations
3. WHEN examining business workflows THEN the system SHALL ensure database schema supports all state transitions
4. IF new features are implemented in code THEN the system SHALL verify corresponding database migrations exist
5. WHEN reviewing error handling THEN the system SHALL ensure database constraints align with application validation logic

### Requirement 6

**User Story:** As a performance engineer, I want to identify query optimization opportunities, so that I can improve application response times and database efficiency.

#### Acceptance Criteria

1. WHEN analyzing service layer queries THEN the system SHALL identify N+1 query patterns and missing eager loading
2. WHEN reviewing complex queries THEN the system SHALL suggest query optimization strategies
3. WHEN examining data access patterns THEN the system SHALL identify opportunities for query result caching
4. IF large table scans are detected THEN the system SHALL recommend appropriate indexing strategies
5. WHEN analyzing join patterns THEN the system SHALL verify optimal foreign key relationships and indexes exist

### Requirement 7

**User Story:** As a data architect, I want to review data model consistency across different application modules, so that I can ensure cohesive data architecture.

#### Acceptance Criteria

1. WHEN examining marketplace, food, parking, and wallet modules THEN the system SHALL verify consistent data modeling patterns
2. WHEN analyzing shared entities like users and orders THEN the system SHALL ensure consistent field naming and types
3. WHEN reviewing audit trails THEN the system SHALL verify consistent timestamp and tracking field usage
4. IF business rules exist across modules THEN the system SHALL ensure consistent database constraint implementation
5. WHEN examining data relationships THEN the system SHALL verify consistent foreign key naming and cascade behavior
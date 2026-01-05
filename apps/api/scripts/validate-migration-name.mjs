#!/usr/bin/env node

const migrationName = process.env.npm_config_name;

if (!migrationName) {
  console.error('❌ Error: Migration name is required!');
  console.error('');
  console.error('Usage: npm run <command> --name=YourMigrationName');
  console.error('Example: npm run migration:generate --name=AddUserTable');
  process.exit(1);
}


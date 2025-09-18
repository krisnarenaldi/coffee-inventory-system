import { defineConfig } from 'cypress';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // Database tasks for testing
      on('task', {
        // Seed database with test data
        'db:seed': async () => {
          try {
            // Clean existing data
            await prisma.activityLog.deleteMany();
            await prisma.user.deleteMany();
            await prisma.tenant.deleteMany();
            await prisma.featureFlag.deleteMany();

            // Create test tenants
            const testBrewery = await prisma.tenant.create({
              data: {
                name: 'Test Brewery',
                subdomain: 'test',
                domain: 'testbrewery.com',
                status: 'ACTIVE',
              },
            });

            // Hash password for test users
            const hashedPassword = await bcrypt.hash('password123', 12);

            // Create test users
            const testUsers = [
              {
                email: 'admin@testbrewery.com',
                name: 'Admin User',
                role: 'ADMIN' as const,
                tenantId: testBrewery.id,
              },
              {
                email: 'manager@testbrewery.com',
                name: 'Manager User',
                role: 'MANAGER' as const,
                tenantId: testBrewery.id,
              },
              {
                email: 'staff@testbrewery.com',
                name: 'Staff User',
                role: 'STAFF' as const,
                tenantId: testBrewery.id,
              },
              {
                email: 'brewmaster@testbrewery.com',
                name: 'Brewmaster User',
                role: 'BREWMASTER' as const,
                tenantId: testBrewery.id,
              },
              {
                email: 'sales@testbrewery.com',
                name: 'Sales User',
                role: 'SALES' as const,
                tenantId: testBrewery.id,
              },
              {
                email: 'inactive@testbrewery.com',
                name: 'Inactive User',
                role: 'STAFF' as const,
                tenantId: testBrewery.id,
                isActive: false,
              },
            ];

            for (const userData of testUsers) {
              await prisma.user.create({
                data: {
                  ...userData,
                  password: hashedPassword,
                  isActive: userData.isActive ?? true,
                  emailVerified: new Date(),
                },
              });
            }

            return null;
          } catch (error) {
            console.error('Database seeding failed:', error);
            throw error;
          }
        },

        // Create test user
        'db:createUser': async (userData: any) => {
          const hashedPassword = await bcrypt.hash(userData.password || 'password123', 12);
          
          const user = await prisma.user.create({
            data: {
              email: userData.email,
              name: userData.name,
              role: userData.role,
              tenantId: userData.tenantId,
              password: hashedPassword,
              isActive: true,
              emailVerified: new Date(),
            },
          });
          
          return user;
        },

        // Cleanup test data
        'db:cleanup': async () => {
          await prisma.activityLog.deleteMany();
          await prisma.user.deleteMany();
          await prisma.tenant.deleteMany();
          await prisma.featureFlag.deleteMany();
          return null;
        },
      });
    },
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts',
  },
  viewportWidth: 1280,
  viewportHeight: 720,
  video: false,
  screenshotOnRunFailure: true,
  defaultCommandTimeout: 10000,
  requestTimeout: 10000,
  responseTimeout: 10000,
  env: {
    // Add environment variables for testing
    DEMO_EMAIL: 'admin@demo.brewery',
    DEMO_PASSWORD: 'demo123',
  },
})
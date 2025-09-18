// Custom Cypress commands for authentication testing

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login with email and password
       * @param email - User email
       * @param password - User password
       */
      login(email: string, password: string): Chainable<void>;
      
      /**
       * Login as a specific role
       * @param role - User role (admin, manager, staff, etc.)
       * @param tenantId - Optional tenant ID
       */
      loginAs(role: string, tenantId?: string): Chainable<void>;
      
      /**
       * Logout current user
       */
      logout(): Chainable<void>;
      
      /**
       * Check if user has access to a page
       * @param path - Page path to check
       * @param shouldHaveAccess - Whether user should have access
       */
      checkPageAccess(path: string, shouldHaveAccess: boolean): Chainable<void>;
      
      /**
       * Seed database with test data
       */
      seedDatabase(): Chainable<void>;
      
      /**
       * Clear all authentication data
       */
      clearAuth(): Chainable<void>;
      
      /**
       * Check if user is logged in
       */
      shouldBeLoggedIn(): Chainable<void>;
      
      /**
       * Check if user is logged out
       */
      shouldBeLoggedOut(): Chainable<void>;
      
      /**
       * Check user role
       */
      shouldHaveRole(expectedRole: string): Chainable<void>;
      
      /**
       * Check user tenant
       */
      shouldHaveTenant(expectedTenant: string): Chainable<void>;
      
      /**
       * Make API request
       */
      apiRequest(options: Partial<Cypress.RequestOptions>): Chainable<Cypress.Response<any>>;
      
      /**
       * Make authenticated API request
       */
      authenticatedRequest(options: Partial<Cypress.RequestOptions>): Chainable<Cypress.Response<any>>;
      
      /**
       * Create test user
       */
      createTestUser(userData: {
        email: string;
        name: string;
        role: string;
        tenantId: string;
        password?: string;
      }): Chainable<any>;
      
      /**
       * Create test tenant
       */
      createTestTenant(tenantData: {
        name: string;
        subdomain: string;
        domain?: string;
      }): Chainable<any>;
      
      /**
       * Cleanup test data
       */
      cleanupTestData(): Chainable<any>;
      
      /**
       * Check activity log
       */
      checkActivityLog(expectedActivity: {
        type: string;
        userId?: string;
        tenantId?: string;
      }): Chainable<any>;
      
      /**
       * Set feature flag
       */
      setFeatureFlag(flagName: string, enabled: boolean, tenantId?: string): Chainable<any>;
      
      /**
       * Clear feature flags
       */
      clearFeatureFlags(): Chainable<any>;
    }
  }
}

// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/auth/signin');
    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="login-button"]').click();
    
    // Wait for redirect to dashboard
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="user-menu"]').should('be.visible');
  }, {
    validate() {
      // Validate session is still active
      cy.request({
        url: '/api/auth/session',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('user');
      });
    },
  });
});

// Login as specific role
Cypress.Commands.add('loginAs', (role: string, tenantId?: string) => {
  const userCredentials = {
    admin: { email: 'admin@testbrewery.com', password: 'password123' },
    manager: { email: 'manager@testbrewery.com', password: 'password123' },
    staff: { email: 'staff@testbrewery.com', password: 'password123' },
    brewmaster: { email: 'brewmaster@testbrewery.com', password: 'password123' },
    sales: { email: 'sales@testbrewery.com', password: 'password123' },
    warehouse: { email: 'warehouse@testbrewery.com', password: 'password123' },
    platform_admin: { email: 'platform@brewery-inventory.com', password: 'password123' },
  };
  
  const credentials = userCredentials[role as keyof typeof userCredentials];
  if (!credentials) {
    throw new Error(`Unknown role: ${role}`);
  }
  
  // If tenantId is specified, modify email to include tenant
  let email = credentials.email;
  if (tenantId && role !== 'platform_admin') {
    const [localPart] = email.split('@');
    email = `${localPart}@${tenantId}.com`;
  }
  
  cy.login(email, credentials.password);
});

// Logout command
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  cy.url().should('include', '/auth/signin');
});

// Check page access
Cypress.Commands.add('checkPageAccess', (path: string, shouldHaveAccess: boolean) => {
  cy.visit(path);
  
  if (shouldHaveAccess) {
    cy.get('[data-testid="page-content"]').should('be.visible');
    cy.get('[data-testid="access-denied"]').should('not.exist');
    cy.url().should('include', path);
  } else {
    cy.get('[data-testid="access-denied"]').should('be.visible');
  }
});

// Seed database
Cypress.Commands.add('seedDatabase', () => {
  cy.task('db:seed');
});

// Clear authentication
Cypress.Commands.add('clearAuth', () => {
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.clearAllSessionStorage();
});

// Add custom assertions for authentication
Cypress.Commands.add('shouldBeLoggedIn', () => {
  cy.get('[data-testid="user-menu"]').should('be.visible');
  cy.url().should('not.include', '/auth/signin');
});

Cypress.Commands.add('shouldBeLoggedOut', () => {
  cy.get('[data-testid="email-input"]').should('be.visible');
  cy.url().should('include', '/auth/signin');
});

// Role-specific assertions
Cypress.Commands.add('shouldHaveRole', (expectedRole: string) => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="user-role"]').should('contain', expectedRole);
  cy.get('[data-testid="user-menu"]').click(); // Close menu
});

Cypress.Commands.add('shouldHaveTenant', (expectedTenant: string) => {
  cy.get('[data-testid="tenant-name"]').should('contain', expectedTenant);
});

// API request helpers with authentication
Cypress.Commands.add('apiRequest', (options: Partial<Cypress.RequestOptions>) => {
  return cy.request({
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
    },
  });
});

Cypress.Commands.add('authenticatedRequest', (options: Partial<Cypress.RequestOptions>) => {
  return cy.getCookie('next-auth.session-token').then((cookie) => {
    return cy.request({
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        'Cookie': `next-auth.session-token=${cookie?.value}`,
      },
    });
  });
});

// Database helpers
Cypress.Commands.add('createTestUser', (userData: {
  email: string;
  name: string;
  role: string;
  tenantId: string;
  password?: string;
}) => {
  return cy.task('db:createUser', userData);
});

Cypress.Commands.add('createTestTenant', (tenantData: {
  name: string;
  subdomain: string;
  domain?: string;
}) => {
  return cy.task('db:createTenant', tenantData);
});

Cypress.Commands.add('cleanupTestData', () => {
  return cy.task('db:cleanup');
});

// Activity logging helpers
Cypress.Commands.add('checkActivityLog', (expectedActivity: {
  type: string;
  userId?: string;
  tenantId?: string;
}) => {
  return cy.task('db:checkActivityLog', expectedActivity);
});

// Feature flag helpers
Cypress.Commands.add('setFeatureFlag', (flagName: string, enabled: boolean, tenantId?: string) => {
  return cy.task('db:setFeatureFlag', { flagName, enabled, tenantId });
});

Cypress.Commands.add('clearFeatureFlags', () => {
  return cy.task('db:clearFeatureFlags');
});

export {};
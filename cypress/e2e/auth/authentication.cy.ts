describe('Authentication Flow', () => {
  beforeEach(() => {
    // Reset database state before each test
    cy.task('db:seed');
  });

  describe('Login Page', () => {
    beforeEach(() => {
      cy.visit('/auth/signin');
    });

    it('should display login form', () => {
      cy.get('[data-testid="email-input"]').should('be.visible');
      cy.get('[data-testid="password-input"]').should('be.visible');
      cy.get('[data-testid="login-button"]').should('be.visible');
      cy.get('[data-testid="oauth-google"]').should('be.visible');
    });

    it('should show validation errors for empty fields', () => {
      cy.get('[data-testid="login-button"]').click();
      cy.get('[data-testid="email-error"]').should('contain', 'Email is required');
      cy.get('[data-testid="password-error"]').should('contain', 'Password is required');
    });

    it('should show error for invalid email format', () => {
      cy.get('[data-testid="email-input"]').type('invalid-email');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      cy.get('[data-testid="email-error"]').should('contain', 'Invalid email format');
    });

    it('should login successfully with valid credentials', () => {
      cy.get('[data-testid="email-input"]').type('admin@testbrewery.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();

      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="user-menu"]').should('be.visible');
      cy.get('[data-testid="user-name"]').should('contain', 'Admin User');
    });

    it('should show error for invalid credentials', () => {
      cy.get('[data-testid="email-input"]').type('admin@testbrewery.com');
      cy.get('[data-testid="password-input"]').type('wrongpassword');
      cy.get('[data-testid="login-button"]').click();

      cy.get('[data-testid="login-error"]').should('contain', 'Invalid credentials');
      cy.url().should('include', '/auth/signin');
    });

    it('should show error for inactive user', () => {
      cy.get('[data-testid="email-input"]').type('inactive@testbrewery.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();

      cy.get('[data-testid="login-error"]').should('contain', 'Account is inactive');
    });

    it('should redirect to intended page after login', () => {
      // Try to access protected page
      cy.visit('/inventory');
      cy.url().should('include', '/auth/signin');

      // Login
      cy.get('[data-testid="email-input"]').type('admin@testbrewery.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();

      // Should redirect to originally requested page
      cy.url().should('include', '/inventory');
    });
  });

  describe('OAuth Authentication', () => {
    beforeEach(() => {
      cy.visit('/auth/signin');
    });

    it('should display OAuth providers', () => {
      cy.get('[data-testid="oauth-google"]').should('be.visible');
      cy.get('[data-testid="oauth-azure"]').should('be.visible');
      cy.get('[data-testid="oauth-okta"]').should('be.visible');
    });

    it('should initiate Google OAuth flow', () => {
      cy.get('[data-testid="oauth-google"]').click();
      // Note: In real tests, you'd mock the OAuth flow
      // For now, just verify the redirect happens
      cy.url().should('include', 'accounts.google.com');
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      // Login first
      cy.login('admin@testbrewery.com', 'password123');
      cy.visit('/dashboard');
    });

    it('should logout successfully', () => {
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      // Should redirect to login page
      cy.url().should('include', '/auth/signin');
      cy.get('[data-testid="email-input"]').should('be.visible');
    });

    it('should clear session data on logout', () => {
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      // Try to access protected page
      cy.visit('/dashboard');
      cy.url().should('include', '/auth/signin');
    });
  });

  describe('Session Management', () => {
    it('should maintain session across page refreshes', () => {
      cy.login('admin@testbrewery.com', 'password123');
      cy.visit('/dashboard');
      
      cy.reload();
      
      // Should still be logged in
      cy.get('[data-testid="user-menu"]').should('be.visible');
      cy.url().should('include', '/dashboard');
    });

    it('should handle expired sessions', () => {
      cy.login('admin@testbrewery.com', 'password123');
      cy.visit('/dashboard');
      
      // Simulate expired session
      cy.clearCookies();
      cy.reload();
      
      // Should redirect to login
      cy.url().should('include', '/auth/signin');
    });
  });
});

describe('Authorization and Role-Based Access', () => {
  describe('Admin Access', () => {
    beforeEach(() => {
      cy.login('admin@testbrewery.com', 'password123');
    });

    it('should allow admin to access all areas', () => {
      const adminPages = [
        '/dashboard',
        '/inventory',
        '/production',
        '/sales',
        '/reports',
        '/settings',
        '/users'
      ];

      adminPages.forEach(page => {
        cy.visit(page);
        cy.get('[data-testid="page-content"]').should('be.visible');
        cy.get('[data-testid="access-denied"]').should('not.exist');
      });
    });

    it('should show admin-specific features', () => {
      cy.visit('/users');
      cy.get('[data-testid="add-user-button"]').should('be.visible');
      cy.get('[data-testid="user-actions"]').should('be.visible');
    });

    it('should allow admin to manage users', () => {
      cy.visit('/users');
      
      // Create user
      cy.get('[data-testid="add-user-button"]').click();
      cy.get('[data-testid="user-form"]').should('be.visible');
      
      // Edit user
      cy.get('[data-testid="user-row"]').first().within(() => {
        cy.get('[data-testid="edit-user"]').click();
      });
      cy.get('[data-testid="user-form"]').should('be.visible');
    });
  });

  describe('Manager Access', () => {
    beforeEach(() => {
      cy.login('manager@testbrewery.com', 'password123');
    });

    it('should allow manager to access most areas', () => {
      const managerPages = [
        '/dashboard',
        '/inventory',
        '/production',
        '/sales',
        '/reports'
      ];

      managerPages.forEach(page => {
        cy.visit(page);
        cy.get('[data-testid="page-content"]').should('be.visible');
        cy.get('[data-testid="access-denied"]').should('not.exist');
      });
    });

    it('should restrict manager from admin-only areas', () => {
      cy.visit('/settings');
      cy.get('[data-testid="access-denied"]').should('be.visible');
      
      cy.visit('/users');
      cy.get('[data-testid="access-denied"]').should('be.visible');
    });

    it('should show limited user management features', () => {
      cy.visit('/dashboard');
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="admin-settings"]').should('not.exist');
    });
  });

  describe('Staff Access', () => {
    beforeEach(() => {
      cy.login('staff@testbrewery.com', 'password123');
    });

    it('should allow staff to access basic areas', () => {
      const staffPages = [
        '/dashboard',
        '/inventory'
      ];

      staffPages.forEach(page => {
        cy.visit(page);
        cy.get('[data-testid="page-content"]').should('be.visible');
        cy.get('[data-testid="access-denied"]').should('not.exist');
      });
    });

    it('should restrict staff from management areas', () => {
      const restrictedPages = [
        '/production',
        '/sales',
        '/reports',
        '/settings',
        '/users'
      ];

      restrictedPages.forEach(page => {
        cy.visit(page);
        cy.get('[data-testid="access-denied"]').should('be.visible');
      });
    });

    it('should show read-only inventory access', () => {
      cy.visit('/inventory');
      cy.get('[data-testid="add-item-button"]').should('not.exist');
      cy.get('[data-testid="edit-item"]').should('not.exist');
      cy.get('[data-testid="delete-item"]').should('not.exist');
    });
  });

  describe('Brewmaster Access', () => {
    beforeEach(() => {
      cy.login('brewmaster@testbrewery.com', 'password123');
    });

    it('should allow brewmaster to access production areas', () => {
      const brewmasterPages = [
        '/dashboard',
        '/inventory',
        '/production'
      ];

      brewmasterPages.forEach(page => {
        cy.visit(page);
        cy.get('[data-testid="page-content"]').should('be.visible');
        cy.get('[data-testid="access-denied"]').should('not.exist');
      });
    });

    it('should show production management features', () => {
      cy.visit('/production');
      cy.get('[data-testid="create-batch-button"]').should('be.visible');
      cy.get('[data-testid="batch-actions"]').should('be.visible');
    });

    it('should restrict brewmaster from sales and admin areas', () => {
      const restrictedPages = [
        '/sales',
        '/settings',
        '/users'
      ];

      restrictedPages.forEach(page => {
        cy.visit(page);
        cy.get('[data-testid="access-denied"]').should('be.visible');
      });
    });
  });

  describe('Sales Access', () => {
    beforeEach(() => {
      cy.login('sales@testbrewery.com', 'password123');
    });

    it('should allow sales to access sales and reports', () => {
      const salesPages = [
        '/dashboard',
        '/sales',
        '/reports'
      ];

      salesPages.forEach(page => {
        cy.visit(page);
        cy.get('[data-testid="page-content"]').should('be.visible');
        cy.get('[data-testid="access-denied"]').should('not.exist');
      });
    });

    it('should show sales-specific features', () => {
      cy.visit('/sales');
      cy.get('[data-testid="create-order-button"]').should('be.visible');
      cy.get('[data-testid="customer-management"]').should('be.visible');
    });

    it('should restrict sales from production and admin areas', () => {
      const restrictedPages = [
        '/production',
        '/settings',
        '/users'
      ];

      restrictedPages.forEach(page => {
        cy.visit(page);
        cy.get('[data-testid="access-denied"]').should('be.visible');
      });
    });
  });

  describe('Cross-Tenant Isolation', () => {
    it('should prevent access to other tenant data', () => {
      // Login as user from tenant A
      cy.login('admin@brewery-a.com', 'password123');
      cy.visit('/inventory');
      
      // Should only see tenant A data
      cy.get('[data-testid="inventory-item"]').should('contain', 'Brewery A');
      cy.get('[data-testid="inventory-item"]').should('not.contain', 'Brewery B');
    });

    it('should isolate API requests by tenant', () => {
      cy.login('admin@brewery-a.com', 'password123');
      
      cy.intercept('GET', '/api/inventory*').as('getInventory');
      cy.visit('/inventory');
      
      cy.wait('@getInventory').then((interception) => {
        expect(interception.request.headers).to.have.property('x-tenant-id');
      });
    });
  });

  describe('Platform Admin Access', () => {
    beforeEach(() => {
      cy.login('platform@brewery-inventory.com', 'password123');
    });

    it('should allow platform admin to access admin panel', () => {
      cy.visit('/admin');
      cy.get('[data-testid="admin-dashboard"]').should('be.visible');
      cy.get('[data-testid="tenant-management"]').should('be.visible');
    });

    it('should allow platform admin to manage tenants', () => {
      cy.visit('/admin/tenants');
      cy.get('[data-testid="tenant-list"]').should('be.visible');
      cy.get('[data-testid="add-tenant-button"]').should('be.visible');
    });

    it('should allow platform admin to impersonate tenant users', () => {
      cy.visit('/admin/tenants/test-brewery/users');
      cy.get('[data-testid="user-row"]').first().within(() => {
        cy.get('[data-testid="impersonate-user"]').click();
      });
      
      // Should switch to tenant context
      cy.get('[data-testid="impersonation-banner"]').should('be.visible');
      cy.url().should('include', '/dashboard');
    });
  });
});

describe('Security Features', () => {
  describe('CSRF Protection', () => {
    it('should include CSRF tokens in forms', () => {
      cy.login('admin@testbrewery.com', 'password123');
      cy.visit('/users/new');
      
      cy.get('input[name="_token"]').should('exist');
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', () => {
      cy.visit('/auth/signin');
      
      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        cy.get('[data-testid="email-input"]').clear().type('admin@testbrewery.com');
        cy.get('[data-testid="password-input"]').clear().type('wrongpassword');
        cy.get('[data-testid="login-button"]').click();
        cy.wait(1000);
      }
      
      // Should show rate limit error
      cy.get('[data-testid="rate-limit-error"]').should('be.visible');
    });
  });

  describe('Session Security', () => {
    it('should regenerate session on login', () => {
      let initialSessionId: string;
      
      cy.visit('/auth/signin');
      cy.getCookie('next-auth.session-token').then((cookie) => {
        initialSessionId = cookie?.value || '';
      });
      
      cy.login('admin@testbrewery.com', 'password123');
      
      cy.getCookie('next-auth.session-token').then((cookie) => {
        expect(cookie?.value).to.not.equal(initialSessionId);
      });
    });

    it('should set secure cookie flags', () => {
      cy.login('admin@testbrewery.com', 'password123');
      
      cy.getCookie('next-auth.session-token').then((cookie) => {
        expect(cookie).to.have.property('httpOnly', true);
        expect(cookie).to.have.property('secure', true);
        expect(cookie).to.have.property('sameSite', 'lax');
      });
    });
  });
});
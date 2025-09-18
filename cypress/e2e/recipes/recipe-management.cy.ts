describe('Recipe Management', () => {
  beforeEach(() => {
    // Login as admin user
    cy.login('admin@testbrewery.com', 'password123');
    
    // Seed test data
    cy.seedDatabase();
    
    // Visit recipes page
    cy.visit('/recipes');
  });

  afterEach(() => {
    // Clean up test data
    cy.cleanupTestData();
  });

  describe('Recipe Listing and Search', () => {
    it('should display recipes list', () => {
      cy.get('[data-testid="recipes-list"]').should('be.visible');
      cy.get('[data-testid="recipe-card"]').should('have.length.at.least', 1);
    });

    it('should search recipes by name', () => {
      cy.get('[data-testid="search-input"]').type('Latte');
      cy.get('[data-testid="recipe-card"]').should('contain.text', 'Latte');
      
      // Clear search
      cy.get('[data-testid="search-input"]').clear();
      cy.get('[data-testid="recipe-card"]').should('have.length.at.least', 1);
    });

    it('should filter recipes by style', () => {
      cy.get('[data-testid="style-filter"]').select('Espresso-based');
      cy.get('[data-testid="recipe-card"]').each(($card) => {
        cy.wrap($card).should('contain.text', 'Espresso-based');
      });
    });

    it('should sort recipes by name', () => {
      cy.get('[data-testid="sort-select"]').select('name');
      cy.get('[data-testid="sort-order"]').select('asc');
      
      // Verify sorting
      cy.get('[data-testid="recipe-card"] h3').then(($titles) => {
        const titles = Array.from($titles).map(el => el.textContent);
        const sortedTitles = [...titles].sort();
        expect(titles).to.deep.equal(sortedTitles);
      });
    });

    it('should paginate recipes', () => {
      // Assuming we have more than 10 recipes
      cy.get('[data-testid="pagination-next"]').should('be.visible');
      cy.get('[data-testid="pagination-next"]').click();
      cy.url().should('include', 'page=2');
      
      cy.get('[data-testid="pagination-prev"]').click();
      cy.url().should('include', 'page=1');
    });
  });

  describe('Recipe Creation', () => {
    it('should create a new recipe', () => {
      cy.get('[data-testid="add-recipe-btn"]').click();
      
      // Fill recipe form
      cy.get('[data-testid="recipe-name"]').type('Test Cappuccino');
      cy.get('[data-testid="recipe-style"]').type('Espresso-based');
      cy.get('[data-testid="recipe-description"]').type('A test cappuccino recipe');
      cy.get('[data-testid="expected-yield"]').type('6');
      cy.get('[data-testid="process-instructions"]').type('1. Extract espresso\n2. Steam milk\n3. Create foam');
      
      // Add ingredient
      cy.get('[data-testid="add-ingredient-btn"]').click();
      cy.get('[data-testid="ingredient-select-0"]').select('Arabica Coffee Beans');
      cy.get('[data-testid="ingredient-quantity-0"]').type('18');
      cy.get('[data-testid="ingredient-unit-0"]').type('grams');
      cy.get('[data-testid="ingredient-notes-0"]').type('Double shot espresso');
      
      // Submit form
      cy.get('[data-testid="save-recipe-btn"]').click();
      
      // Verify success
      cy.get('[data-testid="success-message"]').should('contain.text', 'Recipe created successfully');
      cy.get('[data-testid="recipe-card"]').should('contain.text', 'Test Cappuccino');
    });

    it('should validate required fields', () => {
      cy.get('[data-testid="add-recipe-btn"]').click();
      
      // Try to submit without required fields
      cy.get('[data-testid="save-recipe-btn"]').click();
      
      // Check validation errors
      cy.get('[data-testid="name-error"]').should('contain.text', 'Name is required');
      cy.get('[data-testid="yield-error"]').should('contain.text', 'Expected yield is required');
    });

    it('should validate expected yield is positive', () => {
      cy.get('[data-testid="add-recipe-btn"]').click();
      
      cy.get('[data-testid="recipe-name"]').type('Test Recipe');
      cy.get('[data-testid="expected-yield"]').type('-5');
      
      cy.get('[data-testid="save-recipe-btn"]').click();
      
      cy.get('[data-testid="yield-error"]').should('contain.text', 'Expected yield must be positive');
    });

    it('should validate ingredient quantities', () => {
      cy.get('[data-testid="add-recipe-btn"]').click();
      
      cy.get('[data-testid="recipe-name"]').type('Test Recipe');
      cy.get('[data-testid="expected-yield"]').type('10');
      
      // Add ingredient with invalid quantity
      cy.get('[data-testid="add-ingredient-btn"]').click();
      cy.get('[data-testid="ingredient-select-0"]').select('Arabica Coffee Beans');
      cy.get('[data-testid="ingredient-quantity-0"]').type('-10');
      cy.get('[data-testid="ingredient-unit-0"]').type('grams');
      
      cy.get('[data-testid="save-recipe-btn"]').click();
      
      cy.get('[data-testid="ingredient-quantity-error-0"]').should('contain.text', 'Quantity must be positive');
    });
  });

  describe('Recipe Viewing', () => {
    it('should view recipe details', () => {
      cy.get('[data-testid="recipe-card"]').first().click();
      
      // Verify recipe details are displayed
      cy.get('[data-testid="recipe-name"]').should('be.visible');
      cy.get('[data-testid="recipe-style"]').should('be.visible');
      cy.get('[data-testid="recipe-description"]').should('be.visible');
      cy.get('[data-testid="expected-yield"]').should('be.visible');
      cy.get('[data-testid="process-instructions"]').should('be.visible');
      cy.get('[data-testid="recipe-version"]').should('be.visible');
      
      // Verify ingredients are displayed
      cy.get('[data-testid="ingredients-list"]').should('be.visible');
      cy.get('[data-testid="ingredient-item"]').should('have.length.at.least', 1);
      
      // Verify batches are displayed
      cy.get('[data-testid="batches-list"]').should('be.visible');
    });

    it('should display recipe version', () => {
      cy.get('[data-testid="recipe-card"]').first().click();
      cy.get('[data-testid="recipe-version"]').should('contain.text', 'Version');
    });
  });

  describe('Recipe Editing', () => {
    it('should edit a recipe', () => {
      cy.get('[data-testid="recipe-card"]').first().click();
      cy.get('[data-testid="edit-recipe-btn"]').click();
      
      // Update recipe details
      cy.get('[data-testid="recipe-name"]').clear().type('Updated Recipe Name');
      cy.get('[data-testid="recipe-description"]').clear().type('Updated description');
      cy.get('[data-testid="expected-yield"]').clear().type('15');
      
      // Update ingredient
      cy.get('[data-testid="ingredient-quantity-0"]').clear().type('20');
      cy.get('[data-testid="ingredient-notes-0"]').clear().type('Updated notes');
      
      // Save changes
      cy.get('[data-testid="save-recipe-btn"]').click();
      
      // Verify success and version increment
      cy.get('[data-testid="success-message"]').should('contain.text', 'Recipe updated successfully');
      cy.get('[data-testid="recipe-version"]').should('contain.text', 'Version 2');
      cy.get('[data-testid="recipe-name"]').should('contain.text', 'Updated Recipe Name');
    });

    it('should add new ingredient to existing recipe', () => {
      cy.get('[data-testid="recipe-card"]').first().click();
      cy.get('[data-testid="edit-recipe-btn"]').click();
      
      // Add new ingredient
      cy.get('[data-testid="add-ingredient-btn"]').click();
      cy.get('[data-testid="ingredient-select-1"]').select('Whole Milk');
      cy.get('[data-testid="ingredient-quantity-1"]').type('6');
      cy.get('[data-testid="ingredient-unit-1"]').type('ounces');
      cy.get('[data-testid="ingredient-notes-1"]').type('Steamed to 150°F');
      
      cy.get('[data-testid="save-recipe-btn"]').click();
      
      // Verify ingredient was added
      cy.get('[data-testid="success-message"]').should('contain.text', 'Recipe updated successfully');
      cy.get('[data-testid="ingredient-item"]').should('contain.text', 'Whole Milk');
    });

    it('should remove ingredient from recipe', () => {
      cy.get('[data-testid="recipe-card"]').first().click();
      cy.get('[data-testid="edit-recipe-btn"]').click();
      
      // Remove first ingredient
      cy.get('[data-testid="remove-ingredient-0"]').click();
      
      cy.get('[data-testid="save-recipe-btn"]').click();
      
      // Verify ingredient was removed
      cy.get('[data-testid="success-message"]').should('contain.text', 'Recipe updated successfully');
    });
  });

  describe('Recipe Duplication', () => {
    it('should duplicate a recipe', () => {
      cy.get('[data-testid="recipe-card"]').first().click();
      cy.get('[data-testid="duplicate-recipe-btn"]').click();
      
      // Verify duplication success
      cy.get('[data-testid="success-message"]').should('contain.text', 'Recipe duplicated successfully');
      
      // Go back to recipes list
      cy.visit('/recipes');
      
      // Verify duplicated recipe exists with "(Copy)" suffix
      cy.get('[data-testid="recipe-card"]').should('contain.text', '(Copy)');
      
      // Click on duplicated recipe
      cy.get('[data-testid="recipe-card"]').contains('(Copy)').click();
      
      // Verify it starts at version 1
      cy.get('[data-testid="recipe-version"]').should('contain.text', 'Version 1');
    });

    it('should duplicate recipe with all ingredients', () => {
      // First, create a recipe with multiple ingredients
      cy.get('[data-testid="add-recipe-btn"]').click();
      cy.get('[data-testid="recipe-name"]').type('Multi-Ingredient Recipe');
      cy.get('[data-testid="expected-yield"]').type('10');
      
      // Add multiple ingredients
      cy.get('[data-testid="add-ingredient-btn"]').click();
      cy.get('[data-testid="ingredient-select-0"]').select('Arabica Coffee Beans');
      cy.get('[data-testid="ingredient-quantity-0"]').type('18');
      cy.get('[data-testid="ingredient-unit-0"]').type('grams');
      
      cy.get('[data-testid="add-ingredient-btn"]').click();
      cy.get('[data-testid="ingredient-select-1"]').select('Whole Milk');
      cy.get('[data-testid="ingredient-quantity-1"]').type('6');
      cy.get('[data-testid="ingredient-unit-1"]').type('ounces');
      
      cy.get('[data-testid="save-recipe-btn"]').click();
      
      // Now duplicate it
      cy.get('[data-testid="duplicate-recipe-btn"]').click();
      
      // Go to duplicated recipe
      cy.visit('/recipes');
      cy.get('[data-testid="recipe-card"]').contains('(Copy)').click();
      
      // Verify all ingredients were copied
      cy.get('[data-testid="ingredient-item"]').should('have.length', 2);
      cy.get('[data-testid="ingredient-item"]').should('contain.text', 'Arabica Coffee Beans');
      cy.get('[data-testid="ingredient-item"]').should('contain.text', 'Whole Milk');
    });
  });

  describe('Recipe Deletion', () => {
    it('should delete a recipe without active batches', () => {
      // Create a new recipe first
      cy.get('[data-testid="add-recipe-btn"]').click();
      cy.get('[data-testid="recipe-name"]').type('Recipe to Delete');
      cy.get('[data-testid="expected-yield"]').type('5');
      cy.get('[data-testid="save-recipe-btn"]').click();
      
      // Delete the recipe
      cy.get('[data-testid="recipe-card"]').contains('Recipe to Delete').click();
      cy.get('[data-testid="delete-recipe-btn"]').click();
      
      // Confirm deletion
      cy.get('[data-testid="confirm-delete-btn"]').click();
      
      // Verify deletion success
      cy.get('[data-testid="success-message"]').should('contain.text', 'Recipe deleted successfully');
      
      // Verify recipe is no longer in list
      cy.visit('/recipes');
      cy.get('[data-testid="recipe-card"]').should('not.contain.text', 'Recipe to Delete');
    });

    it('should prevent deletion of recipe with active batches', () => {
      // Assuming there's a recipe with active batches in seed data
      cy.get('[data-testid="recipe-card"]').first().click();
      
      // Check if recipe has batches
      cy.get('[data-testid="batches-list"] [data-testid="batch-item"]').then(($batches) => {
        if ($batches.length > 0) {
          cy.get('[data-testid="delete-recipe-btn"]').click();
          cy.get('[data-testid="confirm-delete-btn"]').click();
          
          // Verify error message
          cy.get('[data-testid="error-message"]').should('contain.text', 'Cannot delete recipe with active batches');
        }
      });
    });
  });

  describe('Recipe Versioning', () => {
    it('should increment version on recipe update', () => {
      cy.get('[data-testid="recipe-card"]').first().click();
      
      // Check initial version
      cy.get('[data-testid="recipe-version"]').should('contain.text', 'Version 1');
      
      // Edit recipe
      cy.get('[data-testid="edit-recipe-btn"]').click();
      cy.get('[data-testid="recipe-description"]').clear().type('Updated description for version test');
      cy.get('[data-testid="save-recipe-btn"]').click();
      
      // Verify version incremented
      cy.get('[data-testid="recipe-version"]').should('contain.text', 'Version 2');
      
      // Edit again
      cy.get('[data-testid="edit-recipe-btn"]').click();
      cy.get('[data-testid="expected-yield"]').clear().type('20');
      cy.get('[data-testid="save-recipe-btn"]').click();
      
      // Verify version incremented again
      cy.get('[data-testid="recipe-version"]').should('contain.text', 'Version 3');
    });

    it('should show version history', () => {
      cy.get('[data-testid="recipe-card"]').first().click();
      
      // Check if version history is available
      cy.get('[data-testid="version-history-btn"]').should('be.visible');
      cy.get('[data-testid="version-history-btn"]').click();
      
      // Verify version history modal
      cy.get('[data-testid="version-history-modal"]').should('be.visible');
      cy.get('[data-testid="version-item"]').should('have.length.at.least', 1);
    });
  });

  describe('Recipe Yield Calculation', () => {
    it('should display expected yield', () => {
      cy.get('[data-testid="recipe-card"]').first().click();
      cy.get('[data-testid="expected-yield"]').should('be.visible');
      cy.get('[data-testid="expected-yield"]').should('contain.text', 'Expected Yield:');
    });

    it('should calculate total ingredient weight', () => {
      cy.get('[data-testid="recipe-card"]').first().click();
      
      // Check if total weight is calculated and displayed
      cy.get('[data-testid="total-ingredients-weight"]').should('be.visible');
      cy.get('[data-testid="total-ingredients-weight"]').should('contain.text', 'Total Weight:');
    });
  });

  describe('Recipe Process Instructions', () => {
    it('should display process instructions', () => {
      cy.get('[data-testid="recipe-card"]').first().click();
      cy.get('[data-testid="process-instructions"]').should('be.visible');
    });

    it('should format process instructions as numbered list', () => {
      cy.get('[data-testid="add-recipe-btn"]').click();
      
      cy.get('[data-testid="recipe-name"]').type('Process Test Recipe');
      cy.get('[data-testid="expected-yield"]').type('10');
      cy.get('[data-testid="process-instructions"]').type('1. First step\n2. Second step\n3. Third step');
      
      cy.get('[data-testid="save-recipe-btn"]').click();
      
      // Verify instructions are formatted properly
      cy.get('[data-testid="process-instructions"]').should('contain.text', '1. First step');
      cy.get('[data-testid="process-instructions"]').should('contain.text', '2. Second step');
      cy.get('[data-testid="process-instructions"]').should('contain.text', '3. Third step');
    });
  });

  describe('Responsive Design', () => {
    it('should work on mobile devices', () => {
      cy.viewport('iphone-x');
      
      // Test mobile layout
      cy.get('[data-testid="recipes-list"]').should('be.visible');
      cy.get('[data-testid="mobile-menu-btn"]').should('be.visible');
      
      // Test recipe creation on mobile
      cy.get('[data-testid="add-recipe-btn"]').click();
      cy.get('[data-testid="recipe-form"]').should('be.visible');
    });

    it('should work on tablet devices', () => {
      cy.viewport('ipad-2');
      
      // Test tablet layout
      cy.get('[data-testid="recipes-list"]').should('be.visible');
      cy.get('[data-testid="recipe-card"]').should('have.length.at.least', 1);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      // Intercept API calls and simulate network error
      cy.intercept('GET', '/api/recipes', { forceNetworkError: true }).as('getRecipesError');
      
      cy.visit('/recipes');
      
      // Verify error message is displayed
      cy.get('[data-testid="error-message"]').should('contain.text', 'Failed to load recipes');
      cy.get('[data-testid="retry-btn"]').should('be.visible');
    });

    it('should handle server errors gracefully', () => {
      // Intercept API calls and simulate server error
      cy.intercept('POST', '/api/recipes', { statusCode: 500, body: { error: 'Internal server error' } }).as('createRecipeError');
      
      cy.get('[data-testid="add-recipe-btn"]').click();
      cy.get('[data-testid="recipe-name"]').type('Test Recipe');
      cy.get('[data-testid="expected-yield"]').type('10');
      cy.get('[data-testid="save-recipe-btn"]').click();
      
      // Verify error message is displayed
      cy.get('[data-testid="error-message"]').should('contain.text', 'Failed to create recipe');
    });
  });

  describe('Accessibility', () => {
    it('should be accessible with keyboard navigation', () => {
      // Test keyboard navigation
      cy.get('[data-testid="search-input"]').focus();
      cy.focused().should('have.attr', 'data-testid', 'search-input');
      
      cy.get('[data-testid="style-filter"]').focus();
      cy.focused().should('have.attr', 'data-testid', 'style-filter');
      
      cy.get('[data-testid="add-recipe-btn"]').focus();
      cy.focused().should('have.attr', 'data-testid', 'add-recipe-btn');
    });

    it('should have proper ARIA labels', () => {
      cy.get('[data-testid="search-input"]').should('have.attr', 'aria-label');
      cy.get('[data-testid="add-recipe-btn"]').should('have.attr', 'aria-label');
      cy.get('[data-testid="recipe-card"]').first().should('have.attr', 'role', 'button');
    });

    it('should support screen readers', () => {
      cy.get('[data-testid="recipes-list"]').should('have.attr', 'role', 'list');
      cy.get('[data-testid="recipe-card"]').should('have.attr', 'role', 'listitem');
    });
  });

  describe('Performance', () => {
    it('should load recipes quickly', () => {
      const start = Date.now();
      
      cy.visit('/recipes').then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(3000); // Should load within 3 seconds
      });
    });

    it('should handle large recipe lists efficiently', () => {
      // Test with existing recipes and pagination
      cy.visit('/recipes');
      
      // Verify pagination is working if there are many recipes
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="pagination"]').length > 0) {
          cy.get('[data-testid="pagination"]').should('be.visible');
          cy.get('[data-testid="recipe-card"]').should('have.length.at.most', 20); // Assuming max 20 per page
        }
      });
    });
  });
});
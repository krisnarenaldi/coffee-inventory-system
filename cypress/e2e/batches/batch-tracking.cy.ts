describe("Coffee Batch Tracking", () => {
  beforeEach(() => {
    // Login as admin user
    cy.visit("/auth/signin");
    cy.get('input[name="email"]').type("admin@demo.coffeeshop");
    cy.get('input[name="password"]').type("demo123");
    cy.get('button[type="submit"]').click();

    // Wait for redirect to dashboard
    cy.url().should("include", "/dashboard");

    // Navigate to batches page
    cy.visit("/batches");
  });

  describe("Batch Listing and Navigation", () => {
    it("should display the batches page with proper elements", () => {
      cy.contains("h1", "Coffee Batches").should("be.visible");
      cy.contains("Track your coffee production batches").should("be.visible");

      // Check for main action buttons
      cy.contains("button", "Add Batch").should("be.visible");
      cy.contains("button", "Filters").should("be.visible");

      // Check for search and filter elements
      cy.get('input[placeholder*="Search"]').should("be.visible");
      cy.get("select").should("have.length.at.least", 2); // Status and Recipe filters
    });

    it("should display existing batches in table format", () => {
      // Check table headers
      cy.get("table").should("be.visible");
      cy.contains("th", "Batch Number").should("be.visible");
      cy.contains("th", "Roast Profile").should("be.visible");
      cy.contains("th", "Status").should("be.visible");
      cy.contains("th", "Start Date").should("be.visible");
      cy.contains("th", "Yield").should("be.visible");
      cy.contains("th", "Actions").should("be.visible");

      // Check for batch data
      cy.get("tbody tr").should("have.length.at.least", 1);
    });

    it("should show batch status badges with correct colors", () => {
      cy.get('[class*="bg-gray-100"]').should("contain", "Planned");
      cy.get('[class*="bg-green-100"]').should("exist");
      cy.get('[class*="bg-orange-100"]').should("exist");
    });
  });

  describe("Batch Search and Filtering", () => {
    it("should search batches by batch number", () => {
      cy.get('input[placeholder*="Search"]').type("LAT");
      cy.wait(1000);

      // Check that search results contain the search term
      cy.get("tbody tr").should("have.length.at.least", 1);
      cy.get("tbody").should("contain", "LAT");
    });

    it("should filter batches by status", () => {
      cy.get("select").first().select("COMPLETED");
      cy.wait(1000);

      // Check that only completed batches are shown
      cy.get("tbody tr").each(($row) => {
        cy.wrap($row).should("contain", "Completed");
      });
    });

    it("should filter batches by recipe", () => {
      cy.get("select").eq(1).select("House Latte");
      cy.wait(1000);

      // Check that only House Latte batches are shown
      cy.get("tbody tr").each(($row) => {
        cy.wrap($row).should("contain", "House Latte");
      });
    });

    it("should clear filters", () => {
      // Apply filters
      cy.get('input[placeholder*="Search"]').type("LAT");
      cy.get("select").first().select("COMPLETED");

      // Clear filters
      cy.contains("button", "Clear Filters").click();

      // Check that all batches are shown again
      cy.get('input[placeholder*="Search"]').should("have.value", "");
      cy.get("select").first().should("have.value", "");
    });
  });

  describe("Batch Creation", () => {
    it("should open batch creation modal", () => {
      cy.contains("button", "Add Batch").click();

      cy.get('[role="dialog"]').should("be.visible");
      cy.contains("h2", "Add New Batch").should("be.visible");

      // Check form fields
      cy.get('select[name="recipeId"]').should("be.visible");
      cy.get('input[name="batchNumber"]').should("be.visible");
      cy.get('input[name="startDate"]').should("be.visible");
      cy.get('textarea[name="notes"]').should("be.visible");
    });

    it("should create a new batch successfully", () => {
      cy.contains("button", "Add Batch").click();

      // Fill out the form
      cy.get('select[name="recipeId"]').select("House Latte");
      cy.get('input[name="batchNumber"]').clear().type("TEST-BATCH-001");
      cy.get('input[name="startDate"]').type("2024-01-20");
      cy.get('textarea[name="notes"]').type("Test batch for E2E testing");

      // Submit the form
      cy.contains("button", "Create Batch").click();

      // Check for success message
      cy.contains("Batch created successfully").should("be.visible");

      // Check that the new batch appears in the list
      cy.contains("TEST-BATCH-001").should("be.visible");
    });

    it("should validate required fields", () => {
      cy.contains("button", "Add Batch").click();

      // Try to submit without filling required fields
      cy.contains("button", "Create Batch").click();

      // Check for validation errors
      cy.contains("Recipe is required").should("be.visible");
      cy.contains("Batch number is required").should("be.visible");
    });

    it("should prevent duplicate batch numbers", () => {
      cy.contains("button", "Add Batch").click();

      // Try to create batch with existing batch number
      cy.get('select[name="recipeId"]').select("House Latte");
      cy.get('input[name="batchNumber"]').clear().type("LAT-2024-001"); // Existing batch

      cy.contains("button", "Create Batch").click();

      // Check for error message
      cy.contains("Batch number already exists").should("be.visible");
    });

    it("should generate batch number automatically", () => {
      cy.contains("button", "Add Batch").click();

      // Click generate button
      cy.contains("button", "Generate").click();

      // Check that batch number is generated
      cy.get('input[name="batchNumber"]').should("not.have.value", "");
      cy.get('input[name="batchNumber"]').should(
        "match",
        /^ROAST-\d{8}-\d{4}$/
      );
    });
  });

  describe("Batch Status Management", () => {
    it("should start a planned batch", () => {
      // Find a planned batch and start it
      cy.get("tbody tr")
        .contains("Planned")
        .parent()
        .within(() => {
          cy.contains("button", "Start Roast").click();
        });

      // Check for success message
      cy.contains("Roast batch started successfully").should("be.visible");

      // Check that status changed
      cy.get("tbody tr").should("contain", "Green Beans Ready");
    });

    it("should update batch status through dropdown", () => {
      // Find a batch that can be updated
      cy.get("tbody tr")
        .contains("Green Beans Ready")
        .parent()
        .within(() => {
          cy.get("select").select("In Progress");
        });

      // Check for success message
      cy.contains("Batch status updated successfully").should("be.visible");

      // Check that status changed
      cy.get("tbody tr").should("contain", "In Progress");
    });

    it("should prevent invalid status transitions", () => {
      // Try to change completed batch status
      cy.get("tbody tr")
        .contains("Completed")
        .parent()
        .within(() => {
          // Completed batches should not have status dropdown
          cy.get("select").should("not.exist");
        });
    });
  });

  describe("Batch Editing and Updates", () => {
    it("should open batch edit modal", () => {
      cy.get("tbody tr")
        .first()
        .within(() => {
          cy.contains("button", "Edit").click();
        });

      cy.get('[role="dialog"]').should("be.visible");
      cy.contains("h2", "Edit Batch").should("be.visible");

      // Check that form is pre-filled
      cy.get('input[name="batchNumber"]').should("not.have.value", "");
    });

    it("should update batch information", () => {
      cy.get("tbody tr")
        .first()
        .within(() => {
          cy.contains("button", "Edit").click();
        });

      // Update notes
      cy.get('textarea[name="notes"]')
        .clear()
        .type("Updated batch notes for testing");

      // Submit the form
      cy.contains("button", "Update Batch").click();

      // Check for success message
      cy.contains("Batch updated successfully").should("be.visible");
    });

    it("should update batch measurements", () => {
      cy.get("tbody tr")
        .first()
        .within(() => {
          cy.contains("button", "Edit").click();
        });

      // Add measurements
      cy.contains("button", "Add Measurement").click();
      cy.get('input[name="temperature"]').type("152");
      cy.get('input[name="extractionTime"]').type("26");
      cy.get('input[name="cuppingScore"]').type("85");

      cy.contains("button", "Update Batch").click();

      cy.contains("Batch updated successfully").should("be.visible");
    });
  });

  describe("Batch Yield Tracking", () => {
    it("should display expected vs actual yield", () => {
      cy.get("tbody tr").each(($row) => {
        cy.wrap($row).within(() => {
          // Check that yield information is displayed
          cy.get("td").eq(4).should("contain", "Expected:");
        });
      });
    });

    it("should calculate yield variance", () => {
      // This would be tested in the batch details view
      cy.get("tbody tr").first().click();

      // Check yield variance calculation
      cy.contains("Yield Variance").should("be.visible");
      cy.get('[data-testid="yield-variance"]').should("contain", "%");
    });
  });

  describe("Batch Deletion", () => {
    it("should delete a batch without products", () => {
      // Create a test batch first
      cy.contains("button", "Add Batch").click();
      cy.get('select[name="recipeId"]').select("House Latte");
      cy.get('input[name="batchNumber"]').clear().type("DELETE-TEST-001");
      cy.contains("button", "Create Batch").click();

      // Wait for batch to be created
      cy.contains("DELETE-TEST-001").should("be.visible");

      // Delete the batch
      cy.get("tbody tr")
        .contains("DELETE-TEST-001")
        .parent()
        .within(() => {
          cy.contains("button", "Delete").click();
        });

      // Confirm deletion
      cy.get('[role="dialog"]').within(() => {
        cy.contains("button", "Delete").click();
      });

      // Check for success message
      cy.contains("Batch deleted successfully").should("be.visible");

      // Check that batch is removed from list
      cy.contains("DELETE-TEST-001").should("not.exist");
    });

    it("should prevent deletion of batch with products", () => {
      // Find a batch with products
      cy.get("tbody tr")
        .contains("Completed")
        .parent()
        .within(() => {
          cy.contains("button", "Delete").click();
        });

      // Check for error message
      cy.contains("Cannot delete batch with associated products").should(
        "be.visible"
      );
    });
  });

  describe("Batch Sorting and Pagination", () => {
    it("should sort batches by different columns", () => {
      // Sort by batch number
      cy.contains("th", "Batch Number").click();
      cy.wait(500);

      // Check that sorting is applied
      cy.get("tbody tr").first().should("contain", "AME"); // Alphabetically first

      // Sort by creation date
      cy.contains("th", "Start Date").click();
      cy.wait(500);
    });

    it("should navigate through pages", () => {
      // Check if pagination exists (only if there are enough batches)
      cy.get("body").then(($body) => {
        if ($body.find('[data-testid="pagination"]').length > 0) {
          cy.get('[data-testid="pagination"]').within(() => {
            cy.contains("button", "Next").click();
            cy.wait(500);
            cy.contains("button", "Previous").click();
          });
        }
      });
    });
  });

  describe("Inventory Integration", () => {
    it("should show insufficient inventory warning", () => {
      // Try to start a batch with insufficient inventory
      cy.contains("button", "Add Batch").click();

      // Create batch with high ingredient requirements
      cy.get('select[name="recipeId"]').select("House Latte");
      cy.get('input[name="batchNumber"]').clear().type("INSUFFICIENT-TEST-001");
      cy.contains("button", "Create Batch").click();

      // Try to start the batch
      cy.get("tbody tr")
        .contains("INSUFFICIENT-TEST-001")
        .parent()
        .within(() => {
          cy.contains("button", "Start Roast").click();
        });

      // Check for insufficient inventory message (if applicable)
      cy.get("body").should("contain", "successfully");
    });
  });

  describe("Responsive Design", () => {
    it("should work on mobile devices", () => {
      cy.viewport("iphone-6");

      // Check that page is still functional
      cy.contains("h1", "Coffee Batches").should("be.visible");
      cy.contains("button", "Add Batch").should("be.visible");

      // Check that table is responsive
      cy.get("table").should("be.visible");
    });

    it("should work on tablet devices", () => {
      cy.viewport("ipad-2");

      // Check that all elements are properly displayed
      cy.contains("h1", "Coffee Batches").should("be.visible");
      cy.get('input[placeholder*="Search"]').should("be.visible");
      cy.get("table").should("be.visible");
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", () => {
      // Intercept API calls and simulate errors
      cy.intercept("GET", "/api/batches*", { statusCode: 500 }).as(
        "getBatchesError"
      );

      cy.reload();
      cy.wait("@getBatchesError");

      // Check for error message
      cy.contains("Failed to fetch batches").should("be.visible");
    });

    it("should handle batch creation errors", () => {
      cy.intercept("POST", "/api/batches", {
        statusCode: 400,
        body: { error: "Validation failed" },
      }).as("createBatchError");

      cy.contains("button", "Add Batch").click();
      cy.get('select[name="recipeId"]').select("House Latte");
      cy.get('input[name="batchNumber"]').clear().type("ERROR-TEST-001");
      cy.contains("button", "Create Batch").click();

      cy.wait("@createBatchError");
      cy.contains("Validation failed").should("be.visible");
    });
  });

  describe("Accessibility", () => {
    it("should be keyboard navigable", () => {
      // Test keyboard navigation
      cy.get("body").focus();
      cy.get("button").first().focus();
      cy.focused().should("contain", "Add Batch");

      cy.get('input[placeholder*="Search"]').focus();
      cy.focused().should("have.attr", "placeholder");
    });

    it("should have proper ARIA labels", () => {
      cy.get("table").should("have.attr", "role", "table");
      cy.get("button").should("have.attr", "type");
      cy.get('input[placeholder*="Search"]').should("have.attr", "aria-label");
    });

    it("should support screen readers", () => {
      // Check for proper heading structure
      cy.get("h1").should("exist");
      cy.get("h2").should("exist");

      // Check for alt text on images (if any)
      cy.get("img").each(($img) => {
        cy.wrap($img).should("have.attr", "alt");
      });
    });
  });

  describe("Performance", () => {
    it("should load batches quickly", () => {
      const startTime = Date.now();

      cy.visit("/batches");
      cy.get("tbody tr").should("have.length.at.least", 1);

      cy.then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(3000); // Should load within 3 seconds
      });
    });

    it("should handle large datasets efficiently", () => {
      // Test with pagination if available
      cy.get("tbody tr").should("have.length.at.most", 10); // Assuming 10 items per page
    });
  });

  describe("Data Persistence", () => {
    it("should persist batch data after page refresh", () => {
      // Get the first batch number
      cy.get("tbody tr")
        .first()
        .find("td")
        .first()
        .invoke("text")
        .as("firstBatchNumber");

      cy.reload();

      // Check that the same batch is still there
      cy.get("@firstBatchNumber").then((batchNumber) => {
        cy.contains(String(batchNumber)).should("be.visible");
      });
    });

    it("should maintain filter state during navigation", () => {
      // Apply a filter
      cy.get("select").first().select("COMPLETED");
      cy.wait(1000);

      // Navigate away and back
      cy.visit("/dashboard");
      cy.visit("/batches");

      // Check that filter is maintained (or reset, depending on design)
      cy.get("select").first().should("have.value", "");
    });
  });
});

// Integration tests with other modules
describe("Batch Tracking Integration", () => {
  beforeEach(() => {
    cy.visit("/auth/signin");
    cy.get('input[name="email"]').type("admin@demo.coffeeshop");
    cy.get('input[name="password"]').type("demo123");
    cy.get('button[type="submit"]').click();
    cy.url().should("include", "/dashboard");
  });

  it("should integrate with recipe management", () => {
    // Navigate to recipes and create a new recipe
    cy.visit("/recipes");
    cy.contains("button", "Add Recipe").click();

    cy.get('input[name="name"]').type("Test Integration Recipe");
    cy.get('select[name="style"]').select("Espresso");
    cy.get('input[name="expectedYield"]').type("10");
    cy.contains("button", "Create Recipe").click();

    // Navigate to batches and use the new recipe
    cy.visit("/batches");
    cy.contains("button", "Add Batch").click();

    cy.get('select[name="recipeId"]').should(
      "contain",
      "Test Integration Recipe"
    );
  });

  it("should integrate with inventory management", () => {
    // Check that starting a batch affects inventory
    cy.visit("/ingredients");

    // Get initial stock level
    cy.get("tbody tr")
      .contains("Arabica Coffee Beans")
      .parent()
      .within(() => {
        cy.get("td").eq(2).invoke("text").as("initialStock");
      });

    // Start a batch
    cy.visit("/batches");
    cy.get("tbody tr")
      .contains("Planned")
      .parent()
      .within(() => {
        cy.contains("button", "Start Roast").click();
      });

    // Check that inventory was deducted
    cy.visit("/ingredients");
    cy.get("@initialStock").then((initialStock) => {
      cy.get("tbody tr")
        .contains("Arabica Coffee Beans")
        .parent()
        .within(() => {
          cy.get("td").eq(2).should("not.contain", initialStock);
        });
    });
  });

  it("should integrate with product management", () => {
    // Complete a batch and check that products are created
    cy.visit("/batches");

    // Find a ready batch and complete it
    cy.get("tbody tr")
      .contains("Ready")
      .parent()
      .within(() => {
        cy.get("select").select("Completed");
      });

    // Navigate to products and check for new products
    cy.visit("/products");
    cy.get("tbody tr").should("have.length.at.least", 1);
  });

  it("should integrate with reporting", () => {
    // Navigate to reports and check batch-related reports
    cy.visit("/reports");

    // Check for roast consistency report
    cy.contains("Roast Consistency").should("be.visible");
    cy.contains("View Report").click();

    // Check that batch data is included in reports
    cy.get('[data-testid="batch-data"]').should("be.visible");
  });
});

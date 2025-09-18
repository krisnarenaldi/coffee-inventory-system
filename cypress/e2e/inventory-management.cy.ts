describe("Inventory Management", () => {
  beforeEach(() => {
    // Visit the login page and authenticate
    cy.visit("/auth/signin");
    cy.get('input[name="email"]').type("admin@demo.coffeeshop");
    cy.get('input[name="password"]').type("demo123");
    cy.get('button[type="submit"]').click();

    // Wait for redirect to dashboard
    cy.url().should("include", "/dashboard");

    // Navigate to ingredients page
    cy.visit("/ingredients");
  });

  describe("Ingredients Page", () => {
    it("should display the ingredients page with proper elements", () => {
      cy.contains("h1", "Ingredients").should("be.visible");
      cy.contains("Manage your raw materials and ingredients").should(
        "be.visible"
      );

      // Check for main action buttons
      cy.contains("button", "Add Ingredient").should("be.visible");
      cy.contains("button", "Scan Code").should("be.visible");
      cy.contains("button", "Filters").should("be.visible");

      // Check for search and filter elements
      cy.get('input[placeholder*="Search"]').should("be.visible");
      cy.get("select").should("have.length.at.least", 2); // Type and Supplier filters
    });

    it("should be able to search for ingredients", () => {
      // Type in search box
      cy.get('input[placeholder*="Search"]').type("coffee");

      // Wait for search results
      cy.wait(1000);

      // Check that search filter badge appears
      cy.contains('Search: "coffee"').should("be.visible");
    });

    it("should be able to filter by ingredient type", () => {
      // Select a type filter
      cy.get("select").first().select("COFFEE_BEANS");

      // Wait for filter to apply
      cy.wait(1000);

      // Check that type filter badge appears
      cy.contains("Type: COFFEE BEANS").should("be.visible");
    });

    it("should show advanced filters when filters button is clicked", () => {
      // Click filters button
      cy.contains("button", "Filters").click();

      // Check that advanced filters panel appears
      cy.contains("Advanced Filters").should("be.visible");
      cy.contains("Location").should("be.visible");
      cy.contains("Min Stock").should("be.visible");
      cy.contains("Max Stock").should("be.visible");
      cy.contains("Sort By").should("be.visible");
    });

    it("should be able to toggle quick filters", () => {
      // Toggle low stock filter
      cy.contains("Low Stock Only").click();

      // Check that filter badge appears
      cy.contains("Low Stock Only").should("be.visible");

      // Toggle expiring soon filter
      cy.contains("Expiring Soon").click();

      // Check that expiring filter appears with dropdown
      cy.get("select").should("contain.value", "30");
    });

    it("should display ingredients table with proper columns", () => {
      // Check table headers
      cy.contains("th", "Name").should("be.visible");
      cy.contains("th", "Type").should("be.visible");
      cy.contains("th", "Stock").should("be.visible");
      cy.contains("th", "Threshold").should("be.visible");
      cy.contains("th", "Cost/Unit").should("be.visible");
      cy.contains("th", "Supplier").should("be.visible");
      cy.contains("th", "Location").should("be.visible");
      cy.contains("th", "Actions").should("be.visible");
    });

    it("should be able to sort by clicking column headers", () => {
      // Click on Name column header
      cy.contains("th", "Name").click();

      // Check for sort indicator
      cy.get("th").first().find("svg").should("be.visible");

      // Click again to reverse sort
      cy.contains("th", "Name").click();
    });

    it("should show results summary", () => {
      // Check that results summary is visible
      cy.contains("Showing").should("be.visible");
      cy.contains("ingredients").should("be.visible");
    });

    it("should be able to clear all filters", () => {
      // Apply some filters first
      cy.get('input[placeholder*="Search"]').type("test");
      cy.contains("Low Stock Only").click();

      // Open advanced filters
      cy.contains("button", "Filters").click();

      // Click clear all filters
      cy.contains("Clear All Filters").click();

      // Check that search input is cleared
      cy.get('input[placeholder*="Search"]').should("have.value", "");
    });
  });

  describe("Add Ingredient Form", () => {
    it("should open add ingredient form when button is clicked", () => {
      cy.contains("button", "Add Ingredient").click();

      // Check that form appears
      cy.contains("Add New Ingredient").should("be.visible");
      cy.get('input[name="name"]').should("be.visible");
      cy.get("select").should("contain.value", "COFFEE_BEANS");
    });

    it("should be able to fill and submit the add ingredient form", () => {
      cy.contains("button", "Add Ingredient").click();

      // Fill out the form
      cy.get("input").first().type("Test Coffee Beans");
      cy.get('input[type="number"]').first().clear().type("100");
      cy.get("input").eq(2).type("lbs");
      cy.get('input[type="number"]').eq(1).clear().type("20");
      cy.get('input[type="number"]').eq(2).clear().type("5.99");

      // Submit the form
      cy.contains("button", "Add Ingredient").click();

      // Wait for form submission
      cy.wait(2000);
    });

    it("should be able to cancel adding ingredient", () => {
      cy.contains("button", "Add Ingredient").click();

      // Click cancel button
      cy.contains("button", "Cancel").click();

      // Check that form is hidden
      cy.contains("Add New Ingredient").should("not.exist");
    });
  });

  describe("QR Scanner", () => {
    it("should open QR scanner when scan code button is clicked", () => {
      cy.contains("button", "Scan Code").click();

      // Check that scanner modal appears
      cy.contains("Scan QR Code or Barcode").should("be.visible");
      cy.contains("Position the QR code or barcode").should("be.visible");
    });

    it("should be able to close QR scanner", () => {
      cy.contains("button", "Scan Code").click();

      // Close the scanner
      cy.contains("button", "Close").click();

      // Check that scanner is hidden
      cy.contains("Scan QR Code or Barcode").should("not.exist");
    });
  });

  describe("Ingredient Actions", () => {
    it("should show action buttons for each ingredient", () => {
      // Check that action buttons exist in the table
      cy.get("table tbody tr")
        .first()
        .within(() => {
          cy.contains("Edit").should("be.visible");
          cy.contains("Delete").should("be.visible");
          cy.contains("Generate QR").should("be.visible");
        });
    });

    it("should open QR generator when Generate QR button is clicked", () => {
      // Click Generate QR button on first ingredient
      cy.get("table tbody tr")
        .first()
        .within(() => {
          cy.contains("Generate QR").click();
        });

      // Check that QR generator modal appears
      cy.contains("QR Code for").should("be.visible");
    });
  });

  describe("Responsive Design", () => {
    it("should work on mobile viewport", () => {
      cy.viewport("iphone-x");

      // Check that page is still functional
      cy.contains("h1", "Ingredients").should("be.visible");
      cy.contains("button", "Add Ingredient").should("be.visible");

      // Check that table is scrollable
      cy.get("table").should("be.visible");
    });

    it("should work on tablet viewport", () => {
      cy.viewport("ipad-2");

      // Check that filters are properly arranged
      cy.get('input[placeholder*="Search"]').should("be.visible");
      cy.get("select").should("be.visible");
    });
  });
});

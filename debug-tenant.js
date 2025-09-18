// Debug tenant subdomain extraction
const hostname = "localhost";
const cleanHostname = hostname.split(":")[0];
const parts = cleanHostname.split(".");

console.log("Hostname:", hostname);
console.log("Clean hostname:", cleanHostname);
console.log("Parts:", parts);

// Handle localhost subdomains (e.g., coffee-logic.localhost) - for development
if (parts.length >= 2 && parts[parts.length - 1] === "localhost") {
  const subdomain = parts[0];
  if (subdomain !== "www") {
    console.log("Extracted subdomain (localhost):", subdomain);
  } else {
    console.log("No subdomain (www)");
  }
} else {
  console.log("Not a localhost subdomain pattern");
}

// Check what the user data shows
console.log("\nUser data from database:");
console.log("- Tenant Subdomain: coffee-central");
console.log("- Expected URL: http://coffee-central.localhost:3000");
console.log("- Current URL: http://localhost:3000");
console.log("\nThe issue: User is trying to login at localhost:3000 but the user belongs to 'coffee-central' tenant");
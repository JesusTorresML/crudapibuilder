/**
 * Extended test client for the ApiBuilder-generated API.
 * Covers CRUD lifecycle and uniqueFields validation.
 *
 * Requirements:
 * - Node.js 18+ (fetch is built-in)
 * - ApiBuilder server running at http://localhost:5000/products
 */

const BASE_URL = "http://localhost:5000/products";

/** Helper: pretty log */
function log(title, data) {
  console.log(`\n=== ${title} ===`);
  console.dir(data, { depth: null });
}

/** Run sequential test requests */
async function run() {
  // 1. Create a product
  let res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Laptop", price: "1200" }),
  });
  let created = await res.json();
  log("Created Product", created);

  // 2. Try to create a duplicate product with the same name
  res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Laptop", price: 1500 }),
  });
  const duplicate = await res.json();
  log("Duplicate Product Attempt", duplicate);

  // 3. Get all products
  res = await fetch(BASE_URL);
  const list = await res.json();
  log("All Products", list);

  res = await fetch(`${BASE_URL}?name=Laptop`);
  const find = await res.json();
  log("Find Products", find);

  // 4. Get product by ID
  res = await fetch(`${BASE_URL}/${created._id ?? "???"}`);
  const single = await res.json();
  log("Get by ID", single);

  // 5. Update product
  res = await fetch(`${BASE_URL}/${created._id ?? "???"}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ price: 999 }),
  });
  const updated = await res.json();
  log("Updated Product", updated);

  // 6. Delete product
  res = await fetch(`${BASE_URL}/${created._id ?? "???"}`, {
    method: "DELETE",
  });
  log("Delete Response", { status: res.status });

  // 7. Final check: products should be empty
  res = await fetch(BASE_URL);
  const finalList = await res.json();
  log("Final Products", finalList);
}

run().catch((err) => console.error("❌ Test failed:", err));

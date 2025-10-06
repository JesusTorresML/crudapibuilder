/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Extended test client for the ApiBuilder-generated API.
 * Covers CRUD lifecycle and uniqueFields validation with proper typing.
 *
 * Requirements:
 * - Node.js 18+ (fetch is built-in)
 * - ApiBuilder server running at http://localhost:5000/products
 *
 * Run:  npx ts-node src/examples/04_test_client.ts
 */

import { WinstonLogger } from "../../infrastructure/logger/winston.logger.js";

const BASE_URL = "http://localhost:5000/products";

/**
 * Product type matching the API schema
 */
interface Product {
  name: string;
  price: number;
}

/**
 * API Response wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    type: string;
    message: string;
    timestamp: string;
    details?: Record<string, unknown>;
  };
  pagination?: {
    skip: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
    currentPage: number;
    totalPages: number;
  };
  timestamp?: string;
}

/**
 * Product document with MongoDB metadata
 */
interface ProductDocument extends Product {
  _id: string;
  createdAt: string;
}

/**
 * Test suite class for API testing
 */
class ApiTestClient {
  private readonly logger: WinstonLogger;
  private readonly baseUrl: string;

  /**
   * Creates a new API test client
   * @param {string} baseUrl - Base URL for the API
   */
  public constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.logger = new WinstonLogger();
  }

  /**
   * Test 1: Create a product with invalid data
   * @returns {Promise<void>}
   */
  public async testCreateInvalidProduct(): Promise<void> {
    this.logger.info("TEST 1: Creating invalid product (missing price)");

    const response = await this.request<ProductDocument>("/", {
      method: "POST",
      body: JSON.stringify({ name: "Laptop" }),
    });

    if (!response.success) {
      this.logger.info("Validation correctly rejected invalid product", {
        error: response.error?.message,
      });
    } else {
      this.logger.warn("Invalid product was accepted (unexpected)");
    }
  }

  /**
   * Test 2: Create a valid product
   * @returns {Promise<ProductDocument | null>} - Product Document
   */
  public async testCreateValidProduct(): Promise<ProductDocument | null> {
    this.logger.info("TEST 2: Creating valid product");

    const response = await this.request<ProductDocument>("/", {
      method: "POST",
      body: JSON.stringify({ name: "Laptop", price: 1200 }),
    });

    if (response.success && response.data) {
      this.logger.info("Product created successfully", {
        id: response.data._id,
        name: response.data.name,
        price: response.data.price,
      });
      return response.data;
    }

    this.logger.error("Failed to create product");
    return null;
  }

  /**
   * Test 3: Try to create a duplicate product
   * @returns {Promise<void>}
   */
  public async testCreateDuplicate(): Promise<void> {
    this.logger.info("TEST 3: Attempting to create duplicate product");

    const response = await this.request<ProductDocument>("/", {
      method: "POST",
      body: JSON.stringify({ name: "Laptop", price: 1500 }),
    });

    if (!response.success) {
      this.logger.info("Duplicate correctly rejected", {
        error: response.error?.message,
        type: response.error?.type,
      });
    } else {
      this.logger.warn("Duplicate was accepted (unexpected)", {
        data: response.data,
      });
    }
  }

  /**
   * Test 4: Get product with invalid ID
   * @returns {Promise<void>}
   */
  public async testGetInvalidId(): Promise<void> {
    this.logger.info("TEST 4: Getting product with invalid ID");

    const response = await this.request<ProductDocument>("/invalid_id_123");

    if (!response.success) {
      this.logger.info("Invalid ID correctly rejected", {
        error: response.error?.message,
      });
    } else {
      this.logger.warn("Invalid ID was accepted (unexpected)");
    }
  }

  /**
   * Test 5: Get all products
   * @returns {Promise<ApiResponse<ProductDocument[]>>} - ApiResponse ProducDocument Array
   */
  public async testGetAllProducts(): Promise<ApiResponse<ProductDocument[]>> {
    this.logger.info("TEST 5: Getting all products");

    const response = await this.request<ProductDocument[]>("/");

    if (response.success && response.data) {
      this.logger.info("Products retrieved successfully", {
        count: response.data.length,
        total: response.pagination?.total,
      });
    }

    return response;
  }

  /**
   * Test 6: Find products by name
   * @returns {Promise<void>}
   */
  public async testFindByName(): Promise<void> {
    this.logger.info("TEST 6: Finding products by name");

    const response = await this.request<ProductDocument[]>("/?name=Laptop");

    if (response.success && response.data) {
      this.logger.info("Find operation completed", {
        found: response.data.length,
        total: response.pagination?.total,
      });
    }
  }

  /**
   * Test 7: Get product by valid ID
   * @param {string} id - Product ID
   * @returns {Promise<void>}
   */
  public async testGetById(id: string): Promise<void> {
    this.logger.info("TEST 7: Getting product by ID", { id });

    const response = await this.request<ProductDocument>(`/${id}`);

    if (response.success && response.data) {
      this.logger.info("Product retrieved successfully", {
        id: response.data._id,
        name: response.data.name,
        price: response.data.price,
      });
    }
  }

  /**
   * Test 8: Update product
   * @param {string} id - Product ID
   * @returns {Promise<void>}
   */
  public async testUpdateProduct(id: string): Promise<void> {
    this.logger.info("TEST 8: Updating product", { id });

    const response = await this.request<ProductDocument>(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ price: 999 }),
    });

    if (response.success && response.data) {
      this.logger.info("Product updated successfully", {
        id: response.data._id,
        oldPrice: 1200,
        newPrice: response.data.price,
      });
    }
  }

  /**
   * Test 9: Delete product with invalid ID
   * @returns {Promise<void>}
   */
  public async testDeleteInvalidId(): Promise<void> {
    this.logger.info("TEST 9: Deleting product with invalid ID");

    const response = await this.request<void>("/random_invalid_id");

    if (!response.success) {
      this.logger.info("Invalid delete ID correctly rejected", {
        error: response.error?.message,
      });
    }
  }

  /**
   * Test 10: Delete product
   * @param {string} id - Product ID
   * @returns {Promise<void>}
   */
  public async testDeleteProduct(id: string): Promise<void> {
    this.logger.info("TEST 10: Deleting product", { id });

    const response = await this.request<void>(`/${id}`, {
      method: "DELETE",
    });

    if (response.success) {
      this.logger.info("Product deleted successfully", { id });
    } else {
      this.logger.error("Failed to delete product", {
        error: response.error?.message,
      });
    }
  }

  /**
   * Test 11: Verify deletion
   * @returns {Promise<void>}
   */
  public async testVerifyDeletion(): Promise<void> {
    this.logger.info("TEST 11: Verifying products list is empty");

    const response = await this.request<ProductDocument[]>("/");

    if (response.success && response.data) {
      if (response.data.length === 0) {
        this.logger.info("Deletion verified - no products remaining");
      } else {
        this.logger.warn("Products still exist after deletion", {
          count: response.data.length,
        });
      }
    }
  }

  /**
   * Runs all tests in sequence
   * @returns {Promise<void>}
   */
  public async runAllTests(): Promise<void> {
    this.logger.info("Starting API test suite");

    try {
      // Test invalid product creation
      await this.testCreateInvalidProduct();
      await this.delay(500);

      // Create valid product
      const product = await this.testCreateValidProduct();
      if (!product) {
        throw new Error("Failed to create initial product");
      }
      await this.delay(500);

      // Test duplicate creation
      await this.testCreateDuplicate();
      await this.delay(500);

      // Test invalid ID
      await this.testGetInvalidId();
      await this.delay(500);

      // Get all products
      await this.testGetAllProducts();
      await this.delay(500);

      // Find by name
      await this.testFindByName();
      await this.delay(500);

      // Get by ID
      await this.testGetById(product._id);
      await this.delay(500);

      // Update product
      await this.testUpdateProduct(product._id);
      await this.delay(500);

      // Delete with invalid ID
      await this.testDeleteInvalidId();
      await this.delay(500);

      // Delete product
      await this.testDeleteProduct(product._id);
      await this.delay(500);

      // Verify deletion
      await this.testVerifyDeletion();

      this.logger.info("All tests completed successfully");
    } catch (error) {
      this.logger.error("Test suite failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Helper method to add delay between tests
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Makes an HTTP request to the API
   * @param {string} path - API path
   * @param {RequestInit} options - Fetch options
   * @returns {Promise<ApiResponse<T>>} API response
   */
  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    this.logger.debug("Making request", {
      method: options.method || "GET",
      url,
    });

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      const data: any = await response.json();

      this.logger.debug("Response received", {
        status: response.status,
        success: data.success,
      });

      return data;
    } catch (error) {
      this.logger.error("Request failed", {
        error: error instanceof Error ? error.message : String(error),
        url,
      });
      throw error;
    }
  }
}

/**
 * Main execution function
 * @returns {Promise<void>}
 */
async function main(): Promise<void> {
  const client = new ApiTestClient(BASE_URL);
  await client.runAllTests();
}

// Execute tests
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

/**
 * Integration Tests for Image Refs API
 *
 * Tests CRUD operations for ImageRef management
 */

import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { Modules } from "@medusajs/framework/utils";

jest.setTimeout(60 * 1000);

// Mock base64 image (1x1 red pixel PNG)
const MOCK_IMAGE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

const ADMIN_TOKEN = 'test-admin-token-12345';

medusaIntegrationTestRunner({
  env: {
    ADMIN_API_TOKEN: ADMIN_TOKEN,
  },
  testSuite: ({ api, getContainer }) => {
    describe("Image Refs API", () => {
      let productId: string;
      let productHandle: string;

      beforeEach(async () => {
        // Create test product
        const container = getContainer();
        const productModuleService = container.resolve(Modules.PRODUCT);

        const product = await productModuleService.createProducts({
          title: "Test Product",
          handle: "test-product",
          status: "published",
        });

        productId = product.id;
        productHandle = product.handle;
      });

      describe("POST /admin/image-refs - Upload Image", () => {
        it("should upload image and create ImageRef", async () => {
          const response = await api.post(
            "/admin/image-refs",
            {
              productId,
              role: "gallery",
              file: {
                content: MOCK_IMAGE_BASE64,
                filename: "test.png",
                mimeType: "image/png",
              },
            },
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          expect(response.status).toEqual(201);
          expect(response.data.imageRef).toBeDefined();
          expect(response.data.imageRef.id).toBeDefined();
          expect(response.data.imageRef.url).toContain(productHandle);
          expect(response.data.imageRef.minioKey).toContain(`products/${productHandle}`);
          expect(response.data.imageRef.role).toEqual("gallery");
          expect(response.data.imageRef.sortOrder).toEqual(0);
        });

        it("should return 401 without auth token", async () => {
          const response = await api.post(
            "/admin/image-refs",
            {
              productId,
              role: "gallery",
              file: {
                content: MOCK_IMAGE_BASE64,
                filename: "test.png",
                mimeType: "image/png",
              },
            }
          );

          expect(response.status).toEqual(401);
        });

        it("should return 401 with invalid auth token", async () => {
          const response = await api.post(
            "/admin/image-refs",
            {
              productId,
              role: "gallery",
              file: {
                content: MOCK_IMAGE_BASE64,
                filename: "test.png",
                mimeType: "image/png",
              },
            },
            {
              headers: {
                Authorization: "Bearer invalid-token",
              },
            }
          );

          expect(response.status).toEqual(401);
        });

        it("should return 404 for non-existent product", async () => {
          const response = await api.post(
            "/admin/image-refs",
            {
              productId: "prod_nonexistent",
              role: "gallery",
              file: {
                content: MOCK_IMAGE_BASE64,
                filename: "test.png",
                mimeType: "image/png",
              },
            },
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          expect(response.status).toEqual(404);
        });

        it("should return 400 for missing productId", async () => {
          const response = await api.post(
            "/admin/image-refs",
            {
              role: "gallery",
              file: {
                content: MOCK_IMAGE_BASE64,
                filename: "test.png",
                mimeType: "image/png",
              },
            },
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          expect(response.status).toEqual(400);
        });

        it("should auto-increment sortOrder", async () => {
          // Upload first image
          const response1 = await api.post(
            "/admin/image-refs",
            {
              productId,
              role: "gallery",
              file: {
                content: MOCK_IMAGE_BASE64,
                filename: "test1.png",
                mimeType: "image/png",
              },
            },
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          expect(response1.data.imageRef.sortOrder).toEqual(0);

          // Upload second image
          const response2 = await api.post(
            "/admin/image-refs",
            {
              productId,
              role: "gallery",
              file: {
                content: MOCK_IMAGE_BASE64,
                filename: "test2.png",
                mimeType: "image/png",
              },
            },
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          expect(response2.data.imageRef.sortOrder).toEqual(1);
        });

        it("should update product thumbnail for first image", async () => {
          const container = getContainer();
          const productModuleService = container.resolve(Modules.PRODUCT);

          // Upload image
          const response = await api.post(
            "/admin/image-refs",
            {
              productId,
              role: "gallery",
              file: {
                content: MOCK_IMAGE_BASE64,
                filename: "test.png",
                mimeType: "image/png",
              },
            },
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          // Verify product thumbnail updated
          const product = await productModuleService.retrieveProduct(productId);
          expect(product.thumbnail).toEqual(response.data.imageRef.url);
        });
      });

      describe("GET /admin/image-refs?productId=X - List Images", () => {
        it("should list all images for product", async () => {
          // Upload 2 images
          await api.post(
            "/admin/image-refs",
            {
              productId,
              role: "gallery",
              file: {
                content: MOCK_IMAGE_BASE64,
                filename: "test1.png",
                mimeType: "image/png",
              },
            },
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          await api.post(
            "/admin/image-refs",
            {
              productId,
              role: "gallery",
              file: {
                content: MOCK_IMAGE_BASE64,
                filename: "test2.png",
                mimeType: "image/png",
              },
            },
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          // List images
          const response = await api.get(
            `/admin/image-refs?productId=${productId}`,
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          expect(response.status).toEqual(200);
          expect(response.data.imageRefs).toHaveLength(2);
          expect(response.data.total).toEqual(2);
        });

        it("should return empty array for product with no images", async () => {
          const response = await api.get(
            `/admin/image-refs?productId=${productId}`,
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          expect(response.status).toEqual(200);
          expect(response.data.imageRefs).toHaveLength(0);
          expect(response.data.total).toEqual(0);
        });

        it("should return 401 without auth token", async () => {
          const response = await api.get(
            `/admin/image-refs?productId=${productId}`
          );

          expect(response.status).toEqual(401);
        });

        it("should return 400 for missing productId", async () => {
          const response = await api.get(
            "/admin/image-refs",
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          expect(response.status).toEqual(400);
        });
      });

      describe("PUT /admin/image-refs/[id] - Update Metadata", () => {
        it("should update sortOrder", async () => {
          // Upload image
          const uploadResponse = await api.post(
            "/admin/image-refs",
            {
              productId,
              role: "gallery",
              file: {
                content: MOCK_IMAGE_BASE64,
                filename: "test.png",
                mimeType: "image/png",
              },
            },
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          const imageRefId = uploadResponse.data.imageRef.id;

          // Update sortOrder
          const updateResponse = await api.put(
            `/admin/image-refs/${imageRefId}`,
            {
              sortOrder: 5,
            },
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          expect(updateResponse.status).toEqual(200);
          expect(updateResponse.data.imageRef.sortOrder).toEqual(5);
        });

        it("should update role", async () => {
          // Upload image
          const uploadResponse = await api.post(
            "/admin/image-refs",
            {
              productId,
              role: "gallery",
              file: {
                content: MOCK_IMAGE_BASE64,
                filename: "test.png",
                mimeType: "image/png",
              },
            },
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          const imageRefId = uploadResponse.data.imageRef.id;

          // Update role
          const updateResponse = await api.put(
            `/admin/image-refs/${imageRefId}`,
            {
              role: "thumbnail",
            },
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          expect(updateResponse.status).toEqual(200);
          expect(updateResponse.data.imageRef.role).toEqual("thumbnail");
        });

        it("should return 404 for non-existent imageRef", async () => {
          const response = await api.put(
            "/admin/image-refs/nonexistent-id",
            {
              sortOrder: 5,
            },
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          expect(response.status).toEqual(404);
        });

        it("should return 401 without auth token", async () => {
          const response = await api.put(
            "/admin/image-refs/some-id",
            {
              sortOrder: 5,
            }
          );

          expect(response.status).toEqual(401);
        });
      });

      describe("DELETE /admin/image-refs/[id] - Delete Image", () => {
        it("should delete image from metadata", async () => {
          // Upload image
          const uploadResponse = await api.post(
            "/admin/image-refs",
            {
              productId,
              role: "gallery",
              file: {
                content: MOCK_IMAGE_BASE64,
                filename: "test.png",
                mimeType: "image/png",
              },
            },
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          const imageRefId = uploadResponse.data.imageRef.id;

          // Delete image
          const deleteResponse = await api.delete(
            `/admin/image-refs/${imageRefId}`,
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          expect(deleteResponse.status).toEqual(200);
          expect(deleteResponse.data.success).toEqual(true);

          // Verify image is removed
          const listResponse = await api.get(
            `/admin/image-refs?productId=${productId}`,
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          expect(listResponse.data.imageRefs).toHaveLength(0);
        });

        it("should update thumbnail if deleted image was thumbnail", async () => {
          const container = getContainer();
          const productModuleService = container.resolve(Modules.PRODUCT);

          // Upload two images
          const upload1 = await api.post(
            "/admin/image-refs",
            {
              productId,
              role: "thumbnail",
              file: {
                content: MOCK_IMAGE_BASE64,
                filename: "test1.png",
                mimeType: "image/png",
              },
            },
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          const upload2 = await api.post(
            "/admin/image-refs",
            {
              productId,
              role: "gallery",
              file: {
                content: MOCK_IMAGE_BASE64,
                filename: "test2.png",
                mimeType: "image/png",
              },
            },
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          // Delete first image (thumbnail)
          await api.delete(
            `/admin/image-refs/${upload1.data.imageRef.id}`,
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          // Verify thumbnail updated to second image
          const product = await productModuleService.retrieveProduct(productId);
          expect(product.thumbnail).toEqual(upload2.data.imageRef.url);
        });

        it("should return 404 for non-existent image", async () => {
          const response = await api.delete(
            "/admin/image-refs/nonexistent-id",
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          expect(response.status).toEqual(404);
        });

        it("should return 401 without auth token", async () => {
          const response = await api.delete(
            "/admin/image-refs/some-id"
          );

          expect(response.status).toEqual(401);
        });
      });

      describe("GET /admin/image-refs/[id] - Get Single Image", () => {
        it("should get single image by ID", async () => {
          // Upload image
          const uploadResponse = await api.post(
            "/admin/image-refs",
            {
              productId,
              role: "gallery",
              file: {
                content: MOCK_IMAGE_BASE64,
                filename: "test.png",
                mimeType: "image/png",
              },
            },
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          const imageRefId = uploadResponse.data.imageRef.id;

          // Get image
          const getResponse = await api.get(
            `/admin/image-refs/${imageRefId}`,
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          expect(getResponse.status).toEqual(200);
          expect(getResponse.data.imageRef.id).toEqual(imageRefId);
        });

        it("should return 404 for non-existent image", async () => {
          const response = await api.get(
            "/admin/image-refs/nonexistent-id",
            {
              headers: {
                Authorization: `Bearer ${ADMIN_TOKEN}`,
              },
            }
          );

          expect(response.status).toEqual(404);
        });

        it("should return 401 without auth token", async () => {
          const response = await api.get(
            "/admin/image-refs/some-id"
          );

          expect(response.status).toEqual(401);
        });
      });
    });
  },
});

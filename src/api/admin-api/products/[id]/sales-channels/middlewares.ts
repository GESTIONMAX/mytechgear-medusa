/**
 * Middlewares for Product Sales Channels API
 * Requires admin authentication
 */

import { defineMiddlewares } from "@medusajs/framework/http";
import { authenticateAdmin } from "../../../../middlewares";

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin-api/products/:id/sales-channels",
      middlewares: [authenticateAdmin],
    },
  ],
});

import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

// Works both from source (server.ts) and compiled (dist/server.js)
const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

// Menu data
const menuData = {
  date: new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
  dishes: [
    {
      id: "dish-of-the-day",
      title: "Dish of the Day",
      name: "Pulled Pork Burger",
      description: "Pulled pork in a homemade burger bun with coleslaw, BBQ sauce and cold vinegar sauce",
      image: "pulled-pork",
      tags: ["meat", "popular"],
    },
    {
      id: "green-dish",
      title: "Green Dish of the Day",
      name: "Tuscan Bean Soup",
      description: "Tuscan bean soup with potatoes and cabbage topped with roasted pea protein",
      image: "tuscan-soup",
      tags: ["vegetarian", "vegan", "healthy"],
    },
  ],
};

/**
 * Creates a new MCP server instance with canteen menu tools and resources.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "Canteen Menu MCP App Server",
    version: "1.0.0",
  });

  const resourceUri = "ui://canteen-menu/mcp-app.html";

  // Register the canteen menu tool
  registerAppTool(server,
    "canteen-menu",
    {
      title: "Today's Canteen Menu",
      description: "Shows today's canteen menu with dish of the day and green dish options.",
      inputSchema: {},
      outputSchema: z.object({
        date: z.string(),
        dishes: z.array(z.object({
          id: z.string(),
          title: z.string(),
          name: z.string(),
          description: z.string(),
          tags: z.array(z.string()),
        })),
      }),
      _meta: { ui: { resourceUri } },
    },
    async (): Promise<CallToolResult> => {
      return {
        content: [{ 
          type: "text", 
          text: `Today's menu (${menuData.date}):\n\n` +
            menuData.dishes.map(d => `**${d.title}**: ${d.name}\n${d.description}`).join("\n\n")
        }],
        structuredContent: {
          date: menuData.date,
          dishes: menuData.dishes.map(({ image, ...rest }) => rest),
        },
      };
    },
  );

  // Register the resource
  registerAppResource(server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(path.join(DIST_DIR, "mcp-app.html"), "utf-8");

      return {
        contents: [
          { uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html },
        ],
      };
    },
  );

  return server;
}

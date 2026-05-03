import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "osm-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "osm_geocode",
        description: "Convert an address into geographic coordinates using OpenStreetMap Nominatim",
        inputSchema: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "The address to geocode (e.g. 'Bole, Addis Ababa')",
            },
          },
          required: ["address"],
        },
      },
      {
        name: "osm_route",
        description: "Calculate travel distance and time between two points using OSRM",
        inputSchema: {
          type: "object",
          properties: {
            origin_lat: { type: "number", description: "Origin latitude" },
            origin_lon: { type: "number", description: "Origin longitude" },
            dest_lat: { type: "number", description: "Destination latitude" },
            dest_lon: { type: "number", description: "Destination longitude" },
          },
          required: ["origin_lat", "origin_lon", "dest_lat", "dest_lon"],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "osm_geocode") {
    const address = args.address;
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        address
      )}&format=json&limit=1`;
      
      const response = await fetch(url, {
        headers: {
          "User-Agent": "citylink-mcp-agent/1.0",
        },
      });
      const data = await response.json();

      if (!data || data.length === 0) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Address not found" }) }],
        };
      }

      const result = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        display_name: data[0].display_name,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: error.message }) }],
      };
    }
  }

  if (name === "osm_route") {
    const { origin_lat, origin_lon, dest_lat, dest_lon } = args;
    try {
      // OSRM format: lon,lat;lon,lat
      const url = `http://router.project-osrm.org/route/v1/driving/${origin_lon},${origin_lat};${dest_lon},${dest_lat}?overview=false`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Route not found" }) }],
        };
      }

      const route = data.routes[0];
      const result = {
        distance_meters: route.distance,
        duration_seconds: route.duration,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: error.message }) }],
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OSM MCP Server running on stdio");
}

run().catch(console.error);

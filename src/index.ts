import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from "./server";

import "./register-tools";

export { server };
export const startServer = async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP Server launched");
};

if (typeof require !== "undefined" && require.main === module) {
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

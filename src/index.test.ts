import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

const { executeExtendScriptMock } = vi.hoisted(() => {
  return {
    executeExtendScriptMock: vi.fn(() => "[]"),
  };
});

vi.mock("./extend-utils/utils", () => {
  return {
    executeExtendScript: executeExtendScriptMock,
  };
});

import "./register-tools";
import { server } from "./server";

describe("mcp tools", () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({
      name: "test client",
      version: "0.1.0",
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);
  });

  afterAll(async () => {
    await Promise.all([client.close(), server.close()]);
  });

  it("ツールが期待通り登録されている", async () => {
    const result = await client.listTools();
    const toolNames = result.tools.map((tool) => tool.name);

    expect(result.tools.length).toBe(22);
    expect(toolNames).toContain("create_document");
    expect(toolNames).toContain("list_textframes");
    expect(toolNames).toContain("change_pathitems");
    expect(toolNames).toContain("count_characters");
  });

  it("引数バリデーションエラーを返す", async () => {
    await expect(
      client.callTool({
        name: "create_document",
        arguments: {
          width: "100mm",
        },
      })
    ).rejects.toThrow("Invalid arguments for tool create_document");
  });

  it("Illustrator 実行ツールで executeExtendScript が呼ばれる", async () => {
    executeExtendScriptMock.mockClear();
    executeExtendScriptMock.mockReturnValueOnce('[{"uuid":"u1"}]');

    const result = await client.callTool({
      name: "create_textframes",
      arguments: {
        count: 1,
      },
    });

    expect(executeExtendScriptMock).toHaveBeenCalledTimes(1);
    expect(result.content[0].type).toBe("text");
    if (result.content[0].type === "text") {
      expect(result.content[0].text).toContain("Placed successfully.");
    }
  });

  it("ローカル処理ツールでは executeExtendScript を呼ばない", async () => {
    executeExtendScriptMock.mockClear();

    const result = await client.callTool({
      name: "count_characters",
      arguments: {
        lines: ["ab", ""],
      },
    });

    expect(executeExtendScriptMock).not.toHaveBeenCalled();
    expect(result.content[0].type).toBe("text");
    if (result.content[0].type === "text") {
      expect(result.content[0].text).toContain('"count":2');
    }
  });
});

import json
import os
from dotenv import load_dotenv
from langchain_mcp_adapters.client import MultiServerMCPClient

load_dotenv()

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
AVIATIONSTACK_API_KEY = os.getenv("AVIATIONSTACK_API_KEY")

client = MultiServerMCPClient({
    "tavily": {
        "transport": "streamable_http",
        "url": f"https://mcp.tavily.com/mcp/?tavilyApiKey={TAVILY_API_KEY}"
    },
    "Aviationstack MCP": {
        "command": "uvx",
        "transport": "stdio",
        "args": [
            "aviationstack-mcp"
        ],
        "env": {
            "AVIATION_STACK_API_KEY": f"{AVIATIONSTACK_API_KEY}"
        }
    }
})


def mcp_result_to_text(result) -> str:
    """Flatten a LangChain/MCP tool result into a plain string.

    MCP tools return content blocks (e.g. [{"type": "text", "text": "..."}])
    rather than a plain str, so callers that expect text must normalize first.
    """
    if isinstance(result, str):
        return result

    if isinstance(result, list):
        parts = []

        for block in result:
            if isinstance(block, dict):
                text = block.get("text")
                if isinstance(text, str):
                    parts.append(text)
                else:
                    parts.append(json.dumps(block, ensure_ascii=False))
            elif hasattr(block, "text"):
                parts.append(str(block.text))
            else:
                parts.append(str(block))

        return "\n\n".join(part for part in parts if part)

    if isinstance(result, dict) and isinstance(result.get("text"), str):
        return result["text"]

    return str(result)


def format_tavily_results(raw_text: str) -> str:
    """Turn Tavily's raw JSON payload into readable, markdown-ish text."""
    try:
        data = json.loads(raw_text)
    except (TypeError, ValueError):
        return raw_text

    if not isinstance(data, dict):
        return raw_text

    lines = []

    if data.get("answer"):
        lines.append(str(data["answer"]))
        lines.append("")

    for index, item in enumerate(data.get("results") or [], 1):
        if not isinstance(item, dict):
            continue

        title = item.get("title") or "Untitled"
        url = item.get("url") or ""
        snippet = (item.get("content") or "").strip()

        if len(snippet) > 300:
            snippet = snippet[:300].rsplit(" ", 1)[0] + "..."

        lines.append(f"{index}. {title}")

        if url:
            lines.append(url)

        if snippet:
            lines.append(snippet)

        lines.append("")

    formatted = "\n".join(lines).strip()

    return formatted or raw_text


async def get_tools_name():
    """Fetch all MCP tools and return them (also prints their names)."""
    tools = await client.get_tools()

    for tool in tools:
        print(tool.name)

    return tools


search_tool = None
aviation_tools = {}


async def intialize_mcp():

    global search_tool
    global aviation_tools

    if search_tool is not None and aviation_tools:
        return

    tools = await get_tools_name()

    print("MCP Available Tools\n")
    print(tools)

    search_tool = next(
        tool
        for tool in tools
        if tool.name == "tavily_search"
    )

    aviation_tools = {
        tool.name: tool
        for tool in tools
        if tool.name != "tavily_search"
    }


async def tavily_mcp_search(query: str):

    await intialize_mcp()
    result = await search_tool.ainvoke({
        "query": query
    })

    text = format_tavily_results(mcp_result_to_text(result))

    print(text)
    return text


async def aviation_mcp(
    tool_name: str,
    tool_args: dict = None
):

    await intialize_mcp()

    tool = aviation_tools.get(tool_name)

    if tool is None:
        raise ValueError(f"Unknown aviation MCP tool: {tool_name}")

    result = await tool.ainvoke(
        tool_args or {}
    )

    text = mcp_result_to_text(result)

    print(text)

    return text

import asyncio
import os
from dotenv import load_dotenv
from langchain_mcp_adapters.client import  MultiServerMCPClient

load_dotenv()

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

client = None
tavily_search_tool = None

async def get_client():
    global client
    if client is None:
        client = MultiServerMCPClient({
            "tavily" : {
                "transport" : "streamable_http",
                "url" : f"https://mcp.tavily.com/mcp/?tavilyApiKey={TAVILY_API_KEY}"
            }
        })
    return client

async def get_tavily_search_tool():
    global tavily_search_tool

    if tavily_search_tool is not None:
        return tavily_search_tool

    client = await get_client()
    tools = await client.get_tools()
    print("MCP Available Tools")

    for tool in tools:
        print(tool.name)

    tavily_search_tool = next(
        tool
        for tool in tools
        if tool.name == "tavily_search"
    )
    return tavily_search_tool  


async def tavily_mcp_search(query : str):
    tool =  await get_tavily_search_tool()
    result = await tool.ainvoke(
        {
            "query":query
        }
    )

    return result

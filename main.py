from mcp_client_test import tavily_mcp_search
import asyncio


if __name__ == "__main__":
    result = asyncio.run(tavily_mcp_search("what is jev model? will that replace llm?"))
    print(result)


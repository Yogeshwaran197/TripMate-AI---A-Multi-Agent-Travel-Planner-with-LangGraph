import os
from tavily import TavilyClient
from dotenv import load_dotenv

load_dotenv()

client = TavilyClient(
    api_key = os.getenv("TAVILY_API_KEY")
)

def tavily_search(query: str):

    response = client.search(
        query = query,
        top_results = 5,
    )

    result = []

    for i , r in enumerate(response["results"], 1):

        title = r.get("title" , "unknown")
        url = r.get("url", "")
        snippet = r.get("content" , "").strip()

        if len(snippet) > 300:
            snippet = snippet[:300].rsplit(" ", 1)[0] + "...."

        result.append(f"*{title}*\n  {url}\n  {snippet}\n")

    return "\n\n".join(result)



        




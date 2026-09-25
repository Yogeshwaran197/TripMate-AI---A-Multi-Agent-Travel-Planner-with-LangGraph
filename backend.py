from tools.tavily_tool import tavily_search


query = "Top 10 places to visit in india"
response = tavily_search(query)

print(response)
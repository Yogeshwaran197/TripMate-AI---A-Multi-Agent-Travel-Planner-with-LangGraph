from tools.tavily_tool import tavily_search
from tools.flight_tool import search_flights
from backend import run_travel_agent


# res = tavily_search("Best hotels in India")
# print(res)


#res = search_flights("Plan a 7 days Nepal trip from India")
#print(res)

user_query = input("Enter travel request : ")

result =  run_travel_agent(
    user_query,
    "yogi03" 
)

print(result['answer'])



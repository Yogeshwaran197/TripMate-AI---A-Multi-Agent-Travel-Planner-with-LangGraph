import os
import operator
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import AIMessage, HumanMessage,  AnyMessage , SystemMessage
from langgraph.graph import StateGraph, START , END
from langgraph.checkpoint.postgres import PostgresSaver

import uuid
import psycopg
from psycopg.rows import dict_row

from typing import Annotated, List , TypedDict, Sequence
from tools.flight_tool import search_flights
from tools.tavily_tool import tavily_search


load_dotenv()


GROQ_API_KEY =  os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY :
    raise ValueError("API KEY MISSING,  Pleas add your API key in .env")


def get_database_url():

    database_url = os.getenv("DATABASE_URL")
    if not database_url :
        raise ValueError("DATABASE url not valid")

    
    if "sslmode" not in database_url:
        separator = "&" if "?" in database_url else "?"
        database_url = f"{database_url}{separator}sslmode=require"
    
    return database_url


llm = ChatGroq(
    model = "qwen/qwen3.8-27b",
    api_key=GROQ_API_KEY
)


class TripAgent(TypedDict):

    messages : Annotated[Sequence[AnyMessage], operator.add]
    user_query : str
    hotel_results:  str
    flight_results : str
    itinerary : str
    llm_calls : int



def flight_agent(state: TripAgent) -> dict:

    user_query = state['user_query']
    flight_data = search_flights(user_query)


    return {
        "flight_results" : flight_data,
        "messages" : [
            AIMessage(content = "Flight details succesfully fetched")
        ],
        "llm_calls" : state.get("llm_calls", 0) + 1
    }

def hotel_agent(state : TripAgent) -> dict:

    user_query = f"Best hotel for {state["user_query"]}"
    hotel_data = tavily_search(user_query)

    return {
        "hotel_results" : hotel_data,
        "messages" : [
            AIMessage(content = "Hotel details succesfully fetched")
        ],
        "llm_calls" : state.get("llm_calls", 0) + 1
    }


def itinerary(state : TripAgent) -> dict :

    prompt =  f"""
                Create a complete travel itinerary.

                User Query:
                {state['user_query']}

                Flight Results:
                {state['flight_results']}

                Hotel Results:
                {state['hotel_results']}

                Make the itinerary practical, budget-aware, and easy to follow.
                """

    response = llm.invoke([
        SystemMessage(content = "You're an expert travel planner"),
        HumanMessage(content=prompt)
    ])

    return {
        "itinerary" : response.content,
        "messages" : [
            response
        ],
        "llm_calls" : state.get("llm_calls", 0) + 1
    }


def final_response(state : TripAgent) -> dict:

    prompt =  f"""
            Generate the final travel response for the user.

            User Request:
            {state['user_query']}

            Flights:
            {state['flight_results']}

            Hotels:
            {state['hotel_results']}

            Itinerary:
            {state['itinerary']}

            Format the final answer beautifully using these sections:

            1. Trip Summary
            2. Flight Information
            3. Hotel Suggestions
            4. Day-by-Day Itinerary
            5. Estimated Budget
            6. Final Recommendations

            Important:
            - Be clear and practical.
            - Mention that live flight API may not provide ticket prices if pricing is unavailable.
            - Keep the response useful for real travel planning.
            """

    response = llm.invoke([
        SystemMessage(content = "You're a professional AI travel booking assistant."),
        HumanMessage(content=prompt)
    ])

    return {
        "messages" : [
            response
        ],
        "llm_calls" : state.get("llm_calls", 0) + 1
    }



#bulid Graph or workflow for trip agent 


graph =  StateGraph(TripAgent)

graph.add_node("Flight_agent", flight_agent)
graph.add_node("Hotel_agent", hotel_agent)
graph.add_node("itinerary", itinerary)
graph.add_node("final_response", final_response)


graph.add_edge(START, "Flight_agent")
graph.add_edge("Flight_agent", "Hotel_agent")
graph.add_edge("Hotel_agent", "itinerary")  
graph.add_edge("itinerary", "final_response")
graph.add_edge("final_response" , END)       


database_url = get_database_url()
conn = psycopg.connect(
    database_url,
    row_factory=dict_row,
    autocommit=True
)
checkpointer = PostgresSaver(
    conn
)

checkpointer.setup()

travel_gent = graph.compile(checkpointer=checkpointer)


def run_travel_agent(user_query ,  thread_id):

    if not thread_id:
        thread_id = f"user_{uuid.uuid4().hex}"
    
    config = { "configurable" : {
        "thread_id" : thread_id
    }}


    result = travel_gent.invoke( {
        "user_query" :  user_query,
        "messages" : [],
        "flight_results" : "",
        "hotel_results": "",
        "itinerary" : "",
        "llm_calls" : 0
    },
    config=config
    )

    final_answer = result["messages"][-1].content

    return {
         "thread_id" : thread_id,
        "answer" : final_answer,
        "flight_results" : result.get("flight_results", ""),
        "hotel_results":  result.get("hotel_results", ""),
        "itinerary" :  result.get("itinerary", ""),
        "llm_calls" :  result.get("llm_calls", 0)
    }





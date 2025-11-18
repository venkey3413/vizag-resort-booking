from typing import TypedDict, Optional, Dict, Any
import re
import os

from langgraph.graph import StateGraph, END
from langchain.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import Chroma
from langchain.schema import AIMessage

from database_service import DatabaseService

# --------------- State -----------------

class AgentState(TypedDict):
    question: str
    intent: str
    context: str
    sql_result: Optional[Dict[str, Any]]
    answer: Optional[str]
    handover: bool

# --------------- Models ----------------

llm = ChatOpenAI(model="gpt-4.1-mini", temperature=0)

embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")
DB_DIR = os.getenv("RAG_DB_DIR", "chroma_store")

# If chroma_store is empty, RAG will just return no context – and we will hand over
vector_db = Chroma(
    persist_directory=DB_DIR,
    embedding_function=embedding_model,
)

intent_prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are an intent classifier for Vizag resort booking assistant. "
        "Classify the user question into one of: policy, timings, rules, partner, availability, booking, resort, food, travel, other. "
        "Use 'booking' for questions about existing bookings/orders, 'resort' for resort information, "
        "'food' for food menu/orders, 'travel' for travel packages, 'availability' for date availability. "
        "Respond with just the label."
    ),
    ("human", "{question}")
])

system_prompt = """You are the official Vizag Resort Booking AI assistant.

You must obey these rules:
1. Use ONLY the provided CONTEXT and SQL_RESULT to answer.
2. Never make up policies, terms, or availability.
3. If you don't find the answer in context/SQL, say:
   "Sorry, I don't have this information. Connecting you to a human agent."
4. Be short, clear, and friendly.
5. For booking inquiries, provide specific details from the database.
6. For availability, give clear yes/no answers with reasons.
7. Always format prices with ₹ symbol.
"""

answer_prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "CONTEXT:\n{context}\n\nDATABASE_RESULT:\n{sql_result}\n\nQUESTION:\n{question}")
])

# --------------- Nodes -----------------

def classify_intent(state: AgentState) -> AgentState:
    msg = intent_prompt.format_messages(question=state["question"])
    resp: AIMessage = llm(msg)
    intent = resp.content.strip().lower()
    
    # Expand intent categories for better database integration
    valid_intents = {"policy", "timings", "rules", "partner", "availability", "booking", "resort", "food", "travel", "other"}
    if intent not in valid_intents:
        intent = "other"
    state["intent"] = intent
    return state

def retrieve_rag(state: AgentState) -> AgentState:
    docs = vector_db.similarity_search(state["question"], k=4)
    context = "\n\n".join(d.page_content for d in docs)
    state["context"] = context
    return state

def run_sql(state: AgentState) -> AgentState:
    if state["intent"] not in ["availability", "booking", "resort"]:
        state["sql_result"] = None
        return state

    text = state["question"].lower()
    db_service = DatabaseService()
    
    # Handle different query types
    if "booking" in text or "reference" in text or "order" in text:
        # Extract booking/order reference
        ref_match = re.search(r"(ve|pa|ke)\d{12}|\d{6,}", text, re.IGNORECASE)
        if ref_match:
            ref = ref_match.group(0)
            if ref.lower().startswith('ve'):
                # Resort booking
                booking = db_service.get_booking(ref)
                state["sql_result"] = {"type": "booking", "data": booking}
            elif ref.lower().startswith('pa'):
                # Food order
                order = db_service.get_food_order(ref)
                state["sql_result"] = {"type": "food_order", "data": order}
            elif ref.lower().startswith('ke'):
                # Travel booking
                booking = db_service.get_travel_booking(ref)
                state["sql_result"] = {"type": "travel_booking", "data": booking}
            else:
                # Generic search
                bookings = db_service.search_bookings(ref)
                state["sql_result"] = {"type": "search", "data": bookings}
        else:
            state["sql_result"] = {"type": "error", "message": "Could not find booking reference"}
    
    elif "availability" in text or "available" in text:
        # Extract resort and date
        date_match = re.search(r"\d{4}-\d{2}-\d{2}", text)
        if date_match:
            date = date_match.group(0)
            # Try to find resort ID (simplified)
            resort_id = 1  # Default to first resort for demo
            availability = db_service.check_availability(resort_id, date)
            state["sql_result"] = {"type": "availability", "data": availability}
        else:
            state["sql_result"] = {"type": "error", "message": "Please provide a date in YYYY-MM-DD format"}
    
    elif "resort" in text or "hotel" in text:
        # Get resorts
        resorts = db_service.get_resorts()
        state["sql_result"] = {"type": "resorts", "data": resorts}
    
    elif "food" in text or "menu" in text:
        # Get food items
        items = db_service.get_food_items()
        state["sql_result"] = {"type": "food_items", "data": items}
    
    elif "travel" in text or "package" in text:
        # Get travel packages
        packages = db_service.get_travel_packages()
        state["sql_result"] = {"type": "travel_packages", "data": packages}
    
    elif "stats" in text or "statistics" in text:
        # Get system stats
        stats = db_service.get_stats()
        state["sql_result"] = {"type": "stats", "data": stats}
    
    else:
        state["sql_result"] = None
    
    return state

def generate_answer(state: AgentState) -> AgentState:
    sql_result = state.get("sql_result")
    
    # Handle database results
    if sql_result:
        result_type = sql_result.get("type")
        data = sql_result.get("data")
        
        if result_type == "booking" and data:
            state["answer"] = f"Found booking {data.get('booking_reference', 'N/A')} for {data.get('guest_name', 'N/A')} at {data.get('resort_name', 'N/A')}. Check-in: {data.get('check_in', 'N/A')}, Status: {data.get('payment_status', 'N/A')}"
            state["handover"] = False
            return state
        
        elif result_type == "food_order" and data:
            state["answer"] = f"Found food order {data.get('order_id', 'N/A')} for {data.get('guest_name', 'N/A')}. Total: ₹{data.get('total', 0)}, Status: {data.get('status', 'N/A')}"
            state["handover"] = False
            return state
        
        elif result_type == "travel_booking" and data:
            state["answer"] = f"Found travel booking {data.get('booking_reference', 'N/A')} for {data.get('customer_name', 'N/A')}. Travel date: {data.get('travel_date', 'N/A')}, Status: {data.get('status', 'N/A')}"
            state["handover"] = False
            return state
        
        elif result_type == "availability" and data:
            if data.get("available"):
                state["answer"] = "Yes, the resort is available for that date!"
            else:
                reason = data.get("reason", "Unknown reason")
                state["answer"] = f"Sorry, the resort is not available for that date. Reason: {reason}"
            state["handover"] = False
            return state
        
        elif result_type == "resorts" and data:
            resort_list = ", ".join([f"{r['name']} (₹{r['price']})" for r in data[:3]])
            state["answer"] = f"Here are our available resorts: {resort_list}. Would you like more details about any specific resort?"
            state["handover"] = False
            return state
        
        elif result_type == "stats" and data:
            state["answer"] = f"System Statistics: {data['totalResorts']} resorts, {data['totalBookings']} confirmed bookings, {data['totalFoodOrders']} food orders, {data['totalTravelBookings']} travel bookings."
            state["handover"] = False
            return state
        
        elif result_type == "error":
            state["answer"] = sql_result.get("message", "Sorry, I couldn't process your request.")
            state["handover"] = True
            return state
    
    # Fallback to RAG-based response
    msg = answer_prompt.format_messages(
        context=state.get("context", ""),
        sql_result=str(sql_result) if sql_result else "No database results",
        question=state["question"],
    )
    resp: AIMessage = llm(msg)
    text = resp.content.strip()

    # If the model indicates missing info, escalate
    if "connecting you to a human agent" in text.lower():
        state["handover"] = True
    else:
        state["handover"] = False

    state["answer"] = text
    return state

# --------------- Graph -----------------

def build_graph():
    graph = StateGraph(AgentState)

    graph.add_node("intent", classify_intent)
    graph.add_node("rag", retrieve_rag)
    graph.add_node("sql", run_sql)
    graph.add_node("answer", generate_answer)

    graph.set_entry_point("intent")
    graph.add_edge("intent", "rag")
    graph.add_edge("rag", "sql")
    graph.add_edge("sql", "answer")
    graph.add_edge("answer", END)

    return graph.compile()

_agent_app = build_graph()

def run_agent(question: str) -> AgentState:
    state: AgentState = {
        "question": question,
        "intent": "",
        "context": "",
        "sql_result": None,
        "answer": None,
        "handover": False,
    }
    return _agent_app.invoke(state)
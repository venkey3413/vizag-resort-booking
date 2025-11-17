from typing import TypedDict, Optional, Dict, Any
import re
import os

from langgraph.graph import StateGraph, END
from langchain.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import Chroma
from langchain.schema import AIMessage

from db import get_session, check_resort_availability

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
        "Classify the user question into one of: policy, timings, rules, partner, availability, other. "
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
"""

answer_prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "CONTEXT:\n{context}\n\nSQL_RESULT:\n{sql_result}\n\nQUESTION:\n{question}")
])

# --------------- Nodes -----------------

def classify_intent(state: AgentState) -> AgentState:
    msg = intent_prompt.format_messages(question=state["question"])
    resp: AIMessage = llm(msg)
    intent = resp.content.strip().lower()
    if intent not in {"policy", "timings", "rules", "partner", "availability", "other"}:
        intent = "other"
    state["intent"] = intent
    return state

def retrieve_rag(state: AgentState) -> AgentState:
    docs = vector_db.similarity_search(state["question"], k=4)
    context = "\n\n".join(d.page_content for d in docs)
    state["context"] = context
    return state

def run_sql(state: AgentState) -> AgentState:
    if state["intent"] != "availability":
        state["sql_result"] = None
        return state

    text = state["question"]
    resort_name = None
    if "royal orchid" in text.lower():
        resort_name = "Royal Orchid"

    date_match = re.search(r"\d{4}-\d{2}-\d{2}", text)
    date = date_match.group(0) if date_match else None

    guests = None
    g_match = re.search(r"(\d+)\s*(people|persons|guests)", text.lower())
    if g_match:
        guests = int(g_match.group(1))

    if not resort_name or not date:
        state["sql_result"] = {
            "known": False,
            "available": None,
            "remaining": None,
            "reason": "Could not parse resort name or date from question."
        }
        return state

    db = get_session()
    try:
        sql_result = check_resort_availability(db, resort_name, date, guests)
    finally:
        db.close()

    state["sql_result"] = sql_result
    return state

def generate_answer(state: AgentState) -> AgentState:
    # Availability logic first
    if state["intent"] == "availability":
        sql = state.get("sql_result") or {}
        if not sql.get("known"):
            state["handover"] = True
            state["answer"] = "Please wait while I connect you to a human agent for real-time availability."
            return state

        if sql.get("available"):
            remaining = sql.get("remaining")
            txt = "Yes, the resort appears to be available for that date."
            if remaining is not None:
                txt += f" Remaining capacity: {remaining} guests."
            state["answer"] = txt
            state["handover"] = False
            return state
        else:
            state["answer"] = "The resort appears to be fully booked for that date."
            state["handover"] = False
            return state

    # Non-availability → policy / timings / etc. via RAG
    msg = answer_prompt.format_messages(
        context=state.get("context", ""),
        sql_result=state.get("sql_result", None),
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
from typing import Dict

conversation_state: Dict[str, dict] = {}

def get_state(session_id: str) -> dict:
    return conversation_state.get(session_id, {})

def update_state(session_id: str, updates: dict):
    state = conversation_state.get(session_id, {})
    state.update(updates)
    conversation_state[session_id] = state

def clear_state(session_id: str):
    conversation_state.pop(session_id, None)

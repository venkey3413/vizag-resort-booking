import time

sla_start = {}

def start(chat_id):
    sla_start[chat_id] = time.time()

def stop(chat_id):
    if chat_id in sla_start:
        return time.time() - sla_start.pop(chat_id)
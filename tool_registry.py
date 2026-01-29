TOOLS = []

def tool(name):
    def wrapper(fn):
        TOOLS.append((name, fn))
        return fn
    return wrapper

@tool("pricing")
def pricing_tool(text):
    if "price" in text.lower():
        return "Rooms start from ₹2,499 per night."

@tool("location")
def location_tool(text):
    if "location" in text.lower():
        return "We are near RK Beach, Vizag."

def run_tools(text):
    for _, fn in TOOLS:
        result = fn(text)
        if result:
            return result
    return None
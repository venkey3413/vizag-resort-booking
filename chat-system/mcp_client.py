import subprocess
import json
import asyncio

async def call_mcp_tool(tool_name: str, arguments: dict) -> str:
    """Call MCP server tool and return response"""
    try:
        # Create MCP request
        request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        }
        
        # Call MCP server via subprocess
        process = subprocess.Popen(
            ["python", "mcp_server/server.py"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Send request and get response
        stdout, stderr = process.communicate(json.dumps(request))
        
        if process.returncode == 0 and stdout:
            response = json.loads(stdout)
            if "result" in response and "content" in response["result"]:
                return response["result"]["content"][0]["text"]
        
        return "MCP server error"
        
    except Exception as e:
        return f"Error calling MCP tool: {str(e)}"
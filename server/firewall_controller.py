import sys
import subprocess
import json
import re

# --- Helper Functions ---
def run_netsh_command(command_list):
    try:
        # Run command with 'utf-8' encoding to handle special characters
        full_command = " ".join(command_list)
        
        result = subprocess.run(
            full_command,
            capture_output=True,
            text=True,
            shell=True,
            encoding='cp437' # Windows command line usually uses CP437
        )
        if result.returncode != 0:
            return {"success": False, "error": result.stderr.strip() or "Command failed."}
        return {"success": True, "output": result.stdout.strip()}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_status():
    cmd = ["netsh", "advfirewall", "show", "allprofiles"]
    result = run_netsh_command(cmd)
    
    if not result["success"]:
        print(json.dumps(result))
        return

    match = re.search(r"State\s+ON", result["output"], re.IGNORECASE)
    status = "Active" if match else "Inactive"
    print(json.dumps({"success": True, "status": status, "profile": "All Profiles"}))

def toggle_firewall(state):
    netsh_state = "on" if state.lower() == "on" else "off"
    cmd = ["netsh", "advfirewall", "set", "allprofiles", "state", netsh_state]
    result = run_netsh_command(cmd)
    print(json.dumps(result))

def add_rule(name, port, protocol, action):
    cmd = [
        "netsh", "advfirewall", "firewall", "add", "rule",
        f'name="{name}"',
        "dir=in",
        f"action={action.lower()}",
        f"protocol={protocol.lower()}",
        f"localport={port}"
    ]
    result = run_netsh_command(cmd)
    print(json.dumps(result))

def get_rules():
    # Fetch all rules
    cmd = ["netsh", "advfirewall", "firewall", "show", "rule", "name=all"]
    result = run_netsh_command(cmd)
    
    if not result["success"]:
        print(json.dumps({"success": False, "rules": []}))
        return

    raw_output = result["output"]
    rules = []
    
    chunks = raw_output.split("Rule Name:")
    
    for chunk in chunks:
        if not chunk.strip(): continue
        
        lines = chunk.split("\n")
        name_match = lines[0].strip()
        
        port = "Any"
        protocol = "Any"
        action = "Unknown"

        p_match = re.search(r"LocalPort:\s+(.+)", chunk)
        if p_match: port = p_match.group(1).strip()
        
        pr_match = re.search(r"Protocol:\s+(.+)", chunk)
        if pr_match: protocol = pr_match.group(1).strip()

        a_match = re.search(r"Action:\s+(.+)", chunk)
        if a_match: action = a_match.group(1).strip()

        # FILTER: Only show custom rules (specific ports) or rules with "Block" in name
        if "Any" not in port or "Test" in name_match or "Block" in name_match:
             rules.append({
                "name": name_match,
                "port": port,
                "protocol": protocol,
                "action": action
            })

    # --- CHANGE IS HERE ---
    # Only return the first 6 rules to keep the list short and neat
    print(json.dumps({"success": True, "rules": rules[:3]}))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No action specified"}))
        sys.exit(1)

    action = sys.argv[1]

    if action == "status":
        get_status()
    elif action == "toggle":
        toggle_firewall(sys.argv[2])
    elif action == "add_rule":
        if len(sys.argv) >= 6:
            add_rule(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])
        else:
             print(json.dumps({"success": False, "error": "Missing arguments for add_rule"}))
    elif action == "get_rules":
        get_rules()
    else:
        print(json.dumps({"success": False, "error": f"Unknown action: {action}"}))
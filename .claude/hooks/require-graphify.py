#!/usr/bin/env python3
"""PreToolUse hook: force codebase search through the graphify skill.

Blocks Grep/Glob outright, and Bash invocations of grep/rg/ag/ack/find,
whenever this project has a built graphify graph - so search/exploration
always goes through `graphify query "<question>"` instead.
"""
import json
import os
import re
import sys

GRAPH_PATH = os.path.join(os.getcwd(), "graphify-out", "graph.json")

SEARCH_CMD_RE = re.compile(r"(^|[|;&\n]|\s)(grep|rg|ag|ack|find)\b")

REASON = (
    "This project indexes its codebase with graphify. Use the graphify skill "
    'instead (Skill tool, name "graphify") - e.g. graphify query "<question>" - '
    "rather than {tool} directly."
)


def deny(tool):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": REASON.format(tool=tool),
        }
    }))


def allow():
    print("{}")


def main():
    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        allow()
        return

    if not os.path.exists(GRAPH_PATH):
        allow()
        return

    tool = data.get("tool_name", "")
    if tool in ("Grep", "Glob"):
        deny(tool)
        return

    if tool == "Bash":
        command = data.get("tool_input", {}).get("command", "")
        if SEARCH_CMD_RE.search(command):
            deny("grep/find/rg via Bash")
            return

    allow()


if __name__ == "__main__":
    main()

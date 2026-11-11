"""Tiny JSON-lines adapter for workshop bots. Source must export act(state)."""
import importlib.util
import json
import sys

source_path = sys.argv[1]
spec = importlib.util.spec_from_file_location("submitted_bot", source_path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
if not callable(getattr(module, "act", None)):
    raise TypeError("Bot source must define act(state)")
state = json.loads(sys.stdin.read())
print(json.dumps(module.act(state)))

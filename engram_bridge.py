"""
Engram HTTP Bridge — wraps the Engram Python API as a REST server on port 4200.
Runway's TypeScript agents call this for persistent memory across runs.

Start with: python engram_bridge.py
"""

import sys
import os

# Add engram to path
sys.path.insert(0, os.path.expanduser("~/engram"))

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import uvicorn

app = FastAPI(title="Engram Bridge", version="1.0.0")

# Lazy-load Engram so startup is fast even if a dep is missing
_chateau = None
_searcher = None
_layers = None

def get_chateau():
    global _chateau, _searcher, _layers
    if _chateau is None:
        from engram.chateau import Chateau
        from engram.backends import get_backend
        from engram.searcher import Searcher
        from engram.layers import LayerStack
        from engram.config import load_config
        cfg = load_config()
        backend = get_backend(cfg)
        _chateau = Chateau(backend)
        _searcher = Searcher(backend)
        _layers = LayerStack(_chateau, _searcher)
    return _chateau, _searcher, _layers


# ── Models ──────────────────────────────────────────────────────────────────

class AddMemoryRequest(BaseModel):
    content: str
    wing: str = "runway"
    room: str = "general"
    hall: str = "facts"
    pinned: bool = False

class SearchRequest(BaseModel):
    query: str
    wing: Optional[str] = None
    room: Optional[str] = None
    n: int = 10

class WakeUpRequest(BaseModel):
    wing: str = "runway"
    rebuild_l1: bool = False

class LoadRoomRequest(BaseModel):
    wing: str
    room: str

class DiaryRequest(BaseModel):
    agent: str
    entry: str
    tags: Optional[list] = None

class CreateWingRequest(BaseModel):
    name: str
    description: str = ""

class CreateRoomRequest(BaseModel):
    wing: str
    name: str
    description: str = ""


# ── Routes ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "engram-bridge"}


@app.post("/wake_up")
def wake_up(req: WakeUpRequest):
    try:
        chateau, searcher, layers = get_chateau()
        context = layers.wake_up(wing=req.wing, rebuild_l1=req.rebuild_l1)
        return {"context": context}
    except Exception as e:
        return {"context": f"[Engram unavailable: {e}]"}


@app.post("/add_memory")
def add_memory(req: AddMemoryRequest):
    try:
        chateau, _, _ = get_chateau()
        from engram.chateau import Drawer
        from engram.shorthand import compress
        drawer = Drawer(
            content=req.content,
            compressed=compress(req.content),
            wing=req.wing,
            room=req.room,
            hall=req.hall,
            pinned=req.pinned,
        )
        chateau.add(drawer)
        return {"ok": True, "id": drawer.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search")
def search(req: SearchRequest):
    try:
        _, searcher, _ = get_chateau()
        results = searcher.search(req.query, n=req.n, wing=req.wing, room=req.room)
        return {"results": [r.__dict__ if hasattr(r, "__dict__") else str(r) for r in results]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/load_room")
def load_room(req: LoadRoomRequest):
    try:
        chateau, searcher, layers = get_chateau()
        context = layers.load_room(wing=req.wing, room=req.room)
        return {"context": context}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/diary/write")
def diary_write(req: DiaryRequest):
    try:
        from engram.agents import engram_diary_write
        engram_diary_write(agent=req.agent, entry=req.entry, tags=req.tags)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/diary/{agent}")
def diary_read(agent: str, last_n: int = 10):
    try:
        from engram.agents import engram_diary_read
        entries = engram_diary_read(agent=agent, last_n=last_n)
        return {"entries": entries}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/create_wing")
def create_wing(req: CreateWingRequest):
    try:
        chateau, _, _ = get_chateau()
        chateau.create_wing(name=req.name, description=req.description)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/create_room")
def create_room(req: CreateRoomRequest):
    try:
        chateau, _, _ = get_chateau()
        chateau.create_room(wing=req.wing, name=req.name, description=req.description)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status")
def status():
    try:
        chateau, _, _ = get_chateau()
        return chateau.status()
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    print("[Engram Bridge] Starting on http://localhost:4200")
    uvicorn.run(app, host="127.0.0.1", port=4200, log_level="warning")

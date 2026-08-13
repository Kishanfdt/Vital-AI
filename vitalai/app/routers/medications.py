"""
MILESTONE 2 - Medication Interaction Checker (tool calling)

Goal: given a list of medications, have Claude call a tool that queries a real
drug-interaction data source (e.g. OpenFDA: https://open.fda.gov/apis/drug/),
then synthesize the raw result into a plain-language explanation.

This is where you'll learn genuine agentic tool use - the model decides WHEN
to call the tool based on the conversation, not just because you told it to.

Build steps:
1. Write a plain Python function `check_interactions(drug_names: list[str]) -> dict`
   that calls the OpenFDA API (or a mock dataset while learning).
2. Define that function as a Claude tool (name, description, input_schema).
3. Send the user's message with tools=[...] and NO tool_choice forcing this time
   (let Claude decide whether it needs to call it).
4. If response.stop_reason == "tool_use", execute the function yourself, then
   send the result back to Claude in a follow-up message with role="tool_result"
   so it can compose the final natural-language answer.
5. Store the checked medication list in the `medications` table (see schema.sql)
   so future triage/chat requests can reference the user's current meds.

Reference: https://docs.claude.com/en/docs/build-with-claude/tool-use
"""

from fastapi import APIRouter, Depends
from app.auth import get_current_user

router = APIRouter(prefix="/medications", tags=["medications"])


@router.get("/health")
def placeholder(user_id: str = Depends(get_current_user)):
    return {"status": "not yet implemented - see module docstring for build plan"}

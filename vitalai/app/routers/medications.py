import json
import urllib.request
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, status
from app.models import MedicationCreate, MedicationResponse, MedicationCheckResponse
from app.auth import get_current_user
from app.database import supabase
from app.services.llm import run_agentic_tool_loop

router = APIRouter(prefix="/medications", tags=["medications"])

SYSTEM_PROMPT = """You are a clinical pharmacology AI assistant. Your goal is to review a patient's medication list for potential drug-drug interactions, side effects, warnings, and precautions.

You have access to the `check_drug_interactions` tool which queries official FDA drug labels.
You should call `check_drug_interactions` with the list of medication names to fetch up-to-date FDA data.

After receiving the tool results, synthesize the raw information into a clear, structured, and easy-to-read explanation for the patient:
1. List each medication checked.
2. Clearly explain any potential drug interactions, severity, or major warnings found.
3. If no major interactions are reported, provide reassuring advice.
4. Give clear advice on what the patient should monitor or discuss with their physician or pharmacist.

Always maintain a professional, helpful tone. Do not alter dosage recommendations."""


def check_drug_interactions(drug_names: list[str]) -> dict:
    """
    Python tool function that queries OpenFDA drug label API for interactions and warnings.
    Returns a dictionary of findings indexed by drug name.
    """
    results = {}
    for drug in drug_names:
        clean_drug = drug.strip()
        if not clean_drug:
            continue
        query = urllib.parse.quote(f'openfda.generic_name:"{clean_drug}" OR openfda.brand_name:"{clean_drug}" OR "{clean_drug}"')
        url = f'https://api.fda.gov/drug/label.json?search={query}&limit=1'
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'VitalAI/1.0'})
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                if 'results' in data and len(data['results']) > 0:
                    item = data['results'][0]
                    openfda_data = item.get('openfda', {})
                    interactions = item.get('drug_interactions', item.get('drug_interactions_table', []))
                    warnings = item.get('warnings', item.get('warnings_and_cautions', item.get('do_not_use', [])))
                    results[clean_drug] = {
                        'found': True,
                        'brand_name': openfda_data.get('brand_name', [clean_drug])[0] if openfda_data.get('brand_name') else clean_drug,
                        'generic_name': openfda_data.get('generic_name', [clean_drug])[0] if openfda_data.get('generic_name') else clean_drug,
                        'drug_interactions': [i[:600] for i in interactions[:2]] if interactions else ["No explicit drug interactions section found in FDA label."],
                        'warnings': [w[:400] for w in warnings[:2]] if warnings else []
                    }
                else:
                    results[clean_drug] = {'found': False, 'message': f'No official FDA label data found for "{clean_drug}".'}
        except urllib.error.HTTPError as e:
            results[clean_drug] = {'found': False, 'message': f'No official FDA label data found for "{clean_drug}" (HTTP {e.code}).'}
        except Exception as e:
            results[clean_drug] = {'found': False, 'message': f'Could not retrieve FDA data for "{clean_drug}": {str(e)}'}
    return results


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "check_drug_interactions",
            "description": "Checks official FDA drug interaction data, warnings, and precautions for a list of medication names.",
            "parameters": {
                "type": "object",
                "properties": {
                    "drug_names": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of medication names to look up in OpenFDA",
                    }
                },
                "required": ["drug_names"],
            },
        },
    }
]


@router.post("", response_model=MedicationResponse)
def add_medication(item: MedicationCreate, user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("medications")
        .insert({
            "user_id": user_id,
            "name": item.name,
            "dosage": item.dosage,
        })
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save medication.")
    return result.data[0]


@router.get("", response_model=list[MedicationResponse])
def list_medications(user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("medications")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.delete("/{id}")
def delete_medication(id: str, user_id: str = Depends(get_current_user)):
    result = (
        supabase.table("medications")
        .delete()
        .eq("id", id)
        .eq("user_id", user_id)
        .execute()
    )
    return {"success": True, "id": id}


@router.post("/check", response_model=MedicationCheckResponse)
def check_medication_interactions(user_id: str = Depends(get_current_user)):
    # 1. Fetch user's current medication list from DB
    med_records = (
        supabase.table("medications")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    ).data or []

    if not med_records:
        return MedicationCheckResponse(
            medications_checked=[],
            has_interactions=False,
            analysis="No medications found in your profile. Please add medications to your list before running an interaction check.",
        )

    med_list_str = ", ".join(
        f"{m['name']} ({m['dosage']})" if m.get('dosage') else m['name']
        for m in med_records
    )
    drug_names = [m["name"] for m in med_records]

    user_message = f"Please evaluate potential drug interactions, side effects, and warnings for my current medication list: {med_list_str}."

    # 2. Invoke tool calling loop
    available_funcs = {"check_drug_interactions": check_drug_interactions}
    analysis, tool_outputs = run_agentic_tool_loop(
        system_prompt=SYSTEM_PROMPT,
        user_message=user_message,
        tools=TOOLS,
        available_functions=available_funcs,
    )

    # 3. Determine if interactions were detected
    fda_data = tool_outputs.get("check_drug_interactions", {})
    has_interactions = False
    for res in fda_data.values():
        if isinstance(res, dict) and res.get("found"):
            interactions = res.get("drug_interactions", [])
            if interactions and "No explicit drug interactions section" not in interactions[0]:
                has_interactions = True
                break

    return MedicationCheckResponse(
        medications_checked=drug_names,
        has_interactions=has_interactions,
        analysis=analysis,
    )

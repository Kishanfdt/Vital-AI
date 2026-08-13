import json
from openai import OpenAI
from app.config import settings

client = OpenAI(api_key=settings.groq_api_key, base_url=settings.groq_base_url)


def get_structured_output(
    system_prompt: str,
    user_message: str,
    tool_name: str,
    tool_description: str,
    input_schema: dict,
    max_tokens: int = 1024,
) -> dict:
    response = client.chat.completions.create(
        model=settings.llm_model,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        tools=[
            {
                "type": "function",
                "function": {
                    "name": tool_name,
                    "description": tool_description,
                    "parameters": input_schema,
                },
            }
        ],
        tool_choice={"type": "function", "function": {"name": tool_name}},
    )

    message = response.choices[0].message
    if not message.tool_calls:
        raise RuntimeError("Model did not return the expected structured tool call")

    arguments = message.tool_calls[0].function.arguments
    return json.loads(arguments)


def stream_chat(system_prompt: str, messages: list[dict]):
    full_messages = [{"role": "system", "content": system_prompt}] + messages

    stream = client.chat.completions.create(
        model=settings.llm_model,
        max_tokens=1024,
        messages=full_messages,
        stream=True,
    )

    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content


def run_agentic_tool_loop(
    system_prompt: str,
    user_message: str,
    tools: list[dict],
    available_functions: dict[str, callable],
    max_tokens: int = 1024,
) -> tuple[str, dict]:
    """
    Executes an unforced tool-calling conversation loop.
    Returns (final_assistant_message, dict_of_tool_outputs_executed).
    """
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    response = client.chat.completions.create(
        model=settings.llm_model,
        max_tokens=max_tokens,
        messages=messages,
        tools=tools,
        tool_choice="auto",
    )

    response_message = response.choices[0].message
    tool_calls = response_message.tool_calls
    tool_outputs = {}

    if tool_calls:
        assistant_dict = {
            "role": "assistant",
            "content": response_message.content or "",
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in tool_calls
            ],
        }
        messages.append(assistant_dict)

        for tool_call in tool_calls:
            function_name = tool_call.function.name
            function_to_call = available_functions.get(function_name)
            if function_to_call:
                try:
                    function_args = json.loads(tool_call.function.arguments)
                except Exception:
                    function_args = {}
                output = function_to_call(**function_args)
                tool_outputs[function_name] = output
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(output),
                })

        second_response = client.chat.completions.create(
            model=settings.llm_model,
            max_tokens=max_tokens,
            messages=messages,
        )
        return second_response.choices[0].message.content or "", tool_outputs

    return response_message.content or "", tool_outputs
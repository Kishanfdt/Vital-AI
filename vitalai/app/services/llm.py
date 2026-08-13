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
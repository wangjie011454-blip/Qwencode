import sys
import dashscope
from dashscope import Generation
import json

dashscope.api_key = 'sk-9058983ce29243e5839723a249482285'

print('Testing stream API...', file=sys.stderr)

response = Generation.call(
    model='qwen-plus',
    messages=[
        {'role': 'system', 'content': '你是一个友好的面试官'},
        {'role': 'user', 'content': '你好'}
    ],
    result_format='message',
    stream=True
)

last_content = ""
for i, chunk in enumerate(response):
    if chunk.status_code == 200:
        data = dict(chunk)
        output = data.get("output", {})
        choices = output.get("choices", [])
        if choices:
            content = choices[0].get("message", {}).get("content", "")
            print(f'Chunk {i}: full content = "{content}"', file=sys.stderr)
            if content and content != last_content:
                new_part = content[len(last_content):]
                print(f'  -> New part: "{new_part}"', file=sys.stderr)
                last_content = content
    if i >= 5:
        break

print(f'Final content: {last_content}', file=sys.stderr)
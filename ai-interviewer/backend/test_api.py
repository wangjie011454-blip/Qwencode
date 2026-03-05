import os
import dashscope
from dashscope import Generation
import json

# 直接设置API Key
dashscope.api_key = 'sk-9058983ce29243e5839723a249482285'

response = Generation.call(
    model='qwen-plus',
    messages=[{'role': 'user', 'content': '你好'}],
    stream=True,
    result_format='message'
)

with open('debug.txt', 'w', encoding='utf-8') as f:
    f.write('Response type: ' + str(type(response)) + '\n')
    for i, chunk in enumerate(response):
        f.write(f'=== Chunk {i} ===\n')
        f.write(f'type: {type(chunk)}\n')
        # 使用dict方式访问
        try:
            d = dict(chunk)
            f.write(f'dict: {json.dumps(d, ensure_ascii=False)}\n')
        except Exception as e:
            f.write(f'dict error: {e}\n')
        f.write('==================\n')
        if i >= 3:
            break
    f.write('DONE\n')
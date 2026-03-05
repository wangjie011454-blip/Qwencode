import sys
import os

# 确保输出到标准输出
import dashscope
from dashscope import Generation

dashscope.api_key = 'sk-9058983ce29243e5839723a249482285'

print('Testing API...', file=sys.stderr)
sys.stderr.flush()

# 不带stream测试
response = Generation.call(
    model='qwen-plus',
    messages=[
        {'role': 'system', 'content': '你是一个友好的面试官'},
        {'role': 'user', 'content': '你好'}
    ],
    result_format='message'
)

print(f'Type: {type(response)}', file=sys.stderr)
print(f'Status: {response.status_code}', file=sys.stderr)
print(f'Code: {response.code}', file=sys.stderr)
print(f'Message: {response.message}', file=sys.stderr)

data = dict(response)
print(f'Data: {data}', file=sys.stderr)

if response.status_code == 200:
    content = data.get('output', {}).get('choices', [{}])[0].get('message', {}).get('content', '')
    print(f'Content: {content}')
else:
    print(f'Error: {data.get("message", "Unknown error")}')
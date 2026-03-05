import requests
import json

url = 'http://localhost:8000/api/chat'
data = {
    'message': '你好',
    'model': 'qwen-plus',
    'resume_text': '测试简历',
    'history': []
}

response = requests.post(url, json=data, stream=True)
print('Status:', response.status_code)

full_content = ''

for line in response.iter_lines():
    if line:
        line = line.decode('utf-8')
        if line.startswith('data: '):
            try:
                d = json.loads(line[6:])
                if 'content' in d:
                    full_content += d['content']
                    print('Content:', full_content)
            except Exception as e:
                print('Error:', e)
        if 'done' in line:
            break

print('===== Full:', full_content, '=====')
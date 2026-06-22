from flask import Flask, request, Response
import requests
import re

app = Flask(__name__)

# 新增代理接口
@app.route('/proxy/stock', methods=['GET', 'POST'])
@app.route('/proxy/stock/<path:path>', methods=['GET', 'POST'])
def proxy_stock(path=''):
    # 构造目标URL
    if path:
        url = f'http://localhost:9988/{path}'
    else:
        url = 'http://localhost:9988/'
    
    resp = requests.request(
        method=request.method,
        url=url,
        headers={key: value for (key, value) in request.headers if key != 'Host'},
        data=request.get_data(),
        cookies=request.cookies,
        allow_redirects=False
    )

    # 处理响应内容，修复静态资源路径
    content = resp.content
    content_type = resp.headers.get('Content-Type', '')
    
    if content_type.startswith('text/html'):
        # 如果是HTML内容，修复其中的链接路径
        content_str = content.decode('utf-8')
        # 将相对路径的静态资源改为通过代理访问
        content_str = re.sub(r'href="(/static/[^"]*)"', r'href="/proxy/stock\1"', content_str)
        content_str = re.sub(r'src="(/static/[^"]*)"', r'src="/proxy/stock\1"', content_str)
        # 修复其他相对链接
        content_str = re.sub(r'href="(/[^"]*)"', r'href="/proxy/stock\1"', content_str)
        content_str = re.sub(r'src="(/[^"]*)"', r'src="/proxy/stock\1"', content_str)
        content = content_str.encode('utf-8')
    elif content_type.startswith('text/css'):
        # 如果是CSS内容，修复其中的url引用
        content_str = content.decode('utf-8')
        content_str = re.sub(r'url\(([^)]+)\)', r'url(/proxy/stock/\1)', content_str)
        content = content_str.encode('utf-8')

    # 返回响应
    excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
    headers = [(name, value) for (name, value) in resp.raw.headers.items() if name.lower() not in excluded_headers]
    response = Response(content, resp.status_code, headers)
    return response

if __name__ == '__main__':
    app.run(port=5001)
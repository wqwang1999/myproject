import os
import logging
from flask import Flask, render_template, request, jsonify, make_response
import uuid

# Ensure Flask finds templates/ and static/ at the project root (one level up from src)
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
app = Flask(
    __name__,
    template_folder=os.path.join(base_dir, 'templates'),
    static_folder=os.path.join(base_dir, 'static'),
)
app.secret_key = 'chat-secret-key'

# Logging setup: record incoming request source, path, headers and short payload
logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s: %(message)s')
app.logger.setLevel(logging.INFO)


@app.before_request
def log_request_info():
    try:
        remote = request.headers.get('X-Forwarded-For', request.remote_addr)
    except Exception:
        remote = 'unknown'
    app.logger.info("Incoming %s %s from %s", request.method, request.path, remote)
    app.logger.info("Host=%s User-Agent=%s", request.headers.get('Host'), request.headers.get('User-Agent'))
    # Log a short preview of payload for POST-like requests
    if request.method in ('POST', 'PUT', 'PATCH'):
        try:
            data = request.get_data(as_text=True)
            if data:
                app.logger.info("Payload preview: %s", data[:1000])
        except Exception as e:
            app.logger.info("Failed read payload: %s", e)

# In-memory store for sessions: {session_id: [{'role':'user'|'bot','text':...}, ...]}
SESSIONS = {}


def get_or_create_session(req):
    sid = req.cookies.get('chat_sid')
    if sid and sid in SESSIONS:
        return sid
    # create new
    sid = str(uuid.uuid4())
    SESSIONS[sid] = []
    return sid


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/data')
def showdata():
    return render_template('showdata.html')


@app.route('/chat')
def chat():
    # ensure session cookie exists
    sid = request.cookies.get('chat_sid')
    if not sid or sid not in SESSIONS:
        sid = str(uuid.uuid4())
        SESSIONS[sid] = []
        resp = make_response(render_template('chat.html'))
        resp.set_cookie('chat_sid', sid)
        return resp
    return render_template('chat.html')


@app.route('/api/sessions')
def api_sessions():
    items = []
    for sid, msgs in SESSIONS.items():
        title = msgs[0]['text'] if msgs else '空会话'
        items.append({'id': sid, 'title': title, 'count': len(msgs)})
    return jsonify(items)


@app.route('/api/history/<sid>')
def api_history(sid):
    msgs = SESSIONS.get(sid, [])
    return jsonify(msgs)


@app.route('/api/send', methods=['POST'])
def api_send():
    data = request.get_json() or {}
    sid = request.cookies.get('chat_sid') or data.get('session_id')
    if not sid or sid not in SESSIONS:
        sid = str(uuid.uuid4())
        SESSIONS[sid] = []

    text = (data.get('text') or '').strip()
    if not text:
        return jsonify({'error': 'empty'}), 400

    # append user message
    SESSIONS[sid].append({'role': 'user', 'text': text})

    # bot reply (always "你好")
    reply = '你好'
    SESSIONS[sid].append({'role': 'bot', 'text': reply})

    resp = make_response(jsonify({'reply': reply, 'session_id': sid, 'history': SESSIONS[sid]}))
    resp.set_cookie('chat_sid', sid)
    return resp


if __name__ == '__main__':
    app.run('127.0.0.1', 5001, debug=True)

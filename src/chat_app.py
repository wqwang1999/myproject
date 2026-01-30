import os
import logging
from functools import wraps
from flask import Flask, render_template, request, jsonify, make_response, redirect, url_for, session
import uuid
import json
import re
from werkzeug.security import generate_password_hash, check_password_hash
import tempfile

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

# Simple in-memory user store for prototype
# username -> {password: str, is_admin: bool}
# USERS stores password hash (for prototype we hash using Werkzeug).
# Structure: username -> {password: <hashed>, is_admin: bool, email: str, note: str}
USERS = {
    # 初始账号都已批准（approved=True）以便能立即登录。新注册用户默认 approved=False。
    'admin': {'password': generate_password_hash('wwq123'), 'is_admin': True, 'email': 'admin@example.com', 'note': '', 'approved': True},
    'user': {'password': generate_password_hash('wwq123'), 'is_admin': False, 'email': 'user@example.com', 'note': '', 'approved': True},
}

# 临时持久化实现（注意：此处为原型/临时方案，后续请迁移到数据库）
# 将用户数据保存到操作系统临时目录下的 JSON 文件，文件名：junyi_users.json
# 存储的位置通过 `tempfile.gettempdir()` 获取，便于在不同系统上运行。
USERS_FILE = os.path.join(tempfile.gettempdir(), 'junyi_users.json')


def load_users_from_tmp():
    """从临时目录加载用户数据到内存 USERS 变量（若文件存在）。"""
    try:
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if isinstance(data, dict):
                USERS.clear()
                USERS.update(data)
                app.logger.info('Loaded users from %s', USERS_FILE)
    except FileNotFoundError:
        app.logger.info('Users file not found at %s - using default users', USERS_FILE)
    except Exception as e:
        app.logger.exception('Failed to load users from %s: %s', USERS_FILE, e)


def save_users_to_tmp():
    """将当前内存 USERS 写入临时目录的 JSON 文件（覆盖）。"""
    try:
        os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(USERS, f, ensure_ascii=False, indent=2)
        app.logger.info('Saved users to %s', USERS_FILE)
    except Exception as e:
        app.logger.exception('Failed to save users to %s: %s', USERS_FILE, e)

# 启动时尝试加载（如果存在持久化文件）
load_users_from_tmp()


def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if 'username' not in session:
            return redirect(url_for('login', next=request.path))
        return f(*args, **kwargs)
    return wrapper


def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get('is_admin'):
            return "Forbidden", 403
        return f(*args, **kwargs)
    return wrapper


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


@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    next_url = request.args.get('next') or url_for('chat')
    if request.method == 'POST':
        username = (request.form.get('username') or '').strip()
        password = (request.form.get('password') or '').strip()
        user = USERS.get(username)
        if not user or not check_password_hash(user.get('password', ''), password):
            error = '用户名或密码错误'
        elif not user.get('approved', True):
            error = '账号尚未被管理员批准，请等待审批'
        else:
            session['username'] = username
            session['is_admin'] = bool(user.get('is_admin'))
            return redirect(next_url)
    return render_template('login.html', error=error)


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    error = None
    if request.method == 'POST':
        username = (request.form.get('username') or '').strip()
        password = (request.form.get('password') or '').strip()
        email = (request.form.get('email') or '').strip()
        note = (request.form.get('note') or '').strip()
        # 验证：用户名仅英文字母；密码需包含字母和数字；邮箱必填且简单校验
        if not username or not password or not email:
            error = '用户名、密码与邮箱为必填项'
        elif not re.fullmatch(r'[A-Za-z]+', username):
            error = '用户名只能包含英文字母'
        elif username in USERS:
            error = '用户名已存在'
        elif not re.search(r'[A-Za-z]', password) or not re.search(r'\d', password):
            error = '密码必须同时包含字母和数字'
        elif not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            error = '邮箱格式不正确'
        else:
            USERS[username] = {
                'password': generate_password_hash(password),
                'is_admin': False,
                'email': email,
                'note': note,
                'approved': False,  # 新注册用户需要管理员批准
            }
            # 保存到临时持久化文件（临时方案，后续替换为数据库）
            save_users_to_tmp()
            # 不直接重定向到登录，向用户展示申请已提交的提示（前端会弹窗提示）
            return render_template('register.html', submitted=True)
    return render_template('register.html', error=error)


@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/data')
def showdata():
    return render_template('showdata.html')


@app.route('/chat')
def chat():
    # require user login to access chat
    if 'username' not in session:
        return redirect(url_for('login', next=request.path))

    # ensure session cookie exists for conversation storage
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


@app.route('/admin/users', methods=['GET', 'POST'])
@admin_required
def admin_users():
    # admin can view and create users here (simple prototype)
    # 支持三种 POST 行为：创建用户（create），批准 pending（approve），拒绝 pending（reject）
    if request.method == 'POST':
        action = request.form.get('action')
        username = (request.form.get('username') or '').strip()
        if action == 'create':
            password = (request.form.get('password') or '').strip()
            email = (request.form.get('email') or '').strip()
            note = (request.form.get('note') or '').strip()
            is_admin = bool(request.form.get('is_admin'))
            # 与注册相同的验证规则
            if not username or not password or not email:
                pass
            elif not re.fullmatch(r'[A-Za-z]+', username):
                pass
            elif username in USERS:
                pass
            elif not re.search(r'[A-Za-z]', password) or not re.search(r'\d', password):
                pass
            elif not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
                pass
            else:
                USERS[username] = {
                    'password': generate_password_hash(password),
                    'is_admin': is_admin,
                    'email': email,
                    'note': note,
                    'approved': True,  # admin 创建的用户默认已批准
                }
                save_users_to_tmp()
        elif action == 'approve' and username:
            if username in USERS:
                USERS[username]['approved'] = True
                save_users_to_tmp()
        elif action == 'reject' and username:
            if username in USERS:
                # 删除申请用户
                USERS.pop(username, None)
                save_users_to_tmp()
    users_list = []
    for k, v in USERS.items():
        users_list.append({
            'username': k,
            'is_admin': v.get('is_admin', False),
            'email': v.get('email', ''),
            'note': v.get('note', ''),
            'approved': v.get('approved', False),
        })
    return render_template('users.html', users=users_list)


@app.route('/api/pending_count')
@admin_required
def api_pending_count():
    # 返回待审批用户数量，管理员页面通过此接口轮询更新提示
    cnt = sum(1 for v in USERS.values() if not v.get('approved', False))
    return jsonify({'pending': cnt})



@app.context_processor
def inject_globals():
    # expose USERS mapping to templates (for admin link pending count)
    return {'USERS': USERS}


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

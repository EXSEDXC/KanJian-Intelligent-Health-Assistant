from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import jwt
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
import os
import json
import urllib.request
import urllib.error

app = Flask(__name__)
# 配置跨域支持（允许所有域名访问，开发环境适用）
CORS(app, supports_credentials=True)  # 允许携带cookie等凭证

# 数据库配置
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# 安全密钥（建议替换为随机生成的复杂字符串，如secrets.token_hex(32)）
app.config['SECRET_KEY'] = 'a-more-secure-secret-key-32bytes-long-enough-for-jwt'

db = SQLAlchemy(app)

# 用户模型
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)  # 存储加密后的密码

# 创建数据库表（首次运行时自动创建）
with app.app_context():
    db.create_all()

# 注册接口
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'message': '用户名和密码不能为空'}), 400
    
    try:
        # 密码加密存储（使用pbkdf2:sha256算法）
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(username=username, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()
        return jsonify({'message': '注册成功'}), 200
    except Exception as e:
        db.session.rollback()
        # 捕获用户名已存在的错误
        if 'UNIQUE constraint failed: user.username' in str(e):
            return jsonify({'message': '用户名已存在'}), 409
        return jsonify({'message': f'注册失败：{str(e)}'}), 500  # 增加错误详情便于调试

# 登录接口
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'message': '用户名和密码不能为空'}), 400
    
    try:
        # 查找用户
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            # 生成JWT token（有效期24小时）
            token = jwt.encode({
                'user_id': user.id,
                'username': user.username,  # 新增用户名信息，方便前端使用
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }, app.config['SECRET_KEY'], algorithm='HS256')
            
            return jsonify({
                'message': '登录成功', 
                'token': token,
                'username': user.username  # 返回用户名，便于前端展示
            }), 200
        else:
            return jsonify({'message': '账号或密码错误'}), 401
    except Exception as e:
        return jsonify({'message': f'登录失败：{str(e)}'}), 500  # 增加错误详情

@app.route('/deepseek-chat', methods=['POST'])
def deepseek_chat():
    data = request.get_json(force=True) or {}
    prompt = data.get('prompt')
    if not prompt:
        return jsonify({'message': '缺少prompt'}), 400
    api_key = os.getenv('sk-a4e46691467949b199c55473d7cb6326')
    if not api_key:
        return jsonify({'message': '服务未配置API密钥'}), 500
    req_data = {
        'model': 'deepseek-chat',
        'messages': [
            {'role': 'system', 'content': '你是一个专业的助手，需要基于提供的图片识别结果，对内容进行解读、分析，用自然流畅的中文回复用户。回复中无需提及识别结果等字样，直接针对内容展开分析。'},
            {'role': 'user', 'content': prompt}
        ],
        'stream': False
    }
    body = json.dumps(req_data).encode('utf-8')
    req = urllib.request.Request(
        'https://api.deepseek.com/chat/completions',
        data=body,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp_body = resp.read()
            parsed = json.loads(resp_body.decode('utf-8'))
            reply = ''
            try:
                reply = parsed.get('choices', [{}])[0].get('message', {}).get('content', '') or ''
            except Exception:
                reply = ''
            return jsonify({'reply': reply, 'raw': parsed}), 200
    except urllib.error.HTTPError as e:
        return jsonify({'message': f'上游错误：{e.code}', 'detail': e.read().decode('utf-8', errors='ignore')}), 502
    except Exception as e:
        return jsonify({'message': f'代理失败：{str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)

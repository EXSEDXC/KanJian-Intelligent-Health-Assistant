from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import jwt
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS  # 导入CORS扩展解决跨域问题

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

if __name__ == '__main__':
    app.run(debug=True)  # 开发环境使用debug模式，生产环境需关闭
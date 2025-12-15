import subprocess
import webbrowser
import time
import os
import sys

def main():
    # 获取当前目录路径
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # --- 1. 定位所有脚本 ---
    server_script = os.path.join(current_dir, 'my_minimind', 'scripts', 'server.py')
    ad_script = os.path.join(current_dir, 'ad.py')
    
    # 假设 Node.js 脚本名为 web_server.js，位于当前目录
    nodejs_script = os.path.join(current_dir, 'server.js') 
    
    if not os.path.exists(server_script):
        print(f"❌ 错误：找不到后端脚本 {server_script}")
        input("按回车键退出...")
        return
    
    # 检查 Node.js 脚本是否存在
    if not os.path.exists(nodejs_script):
        print(f"❌ 错误：找不到 Node.js 脚本 {nodejs_script}。请确保文件存在。")
        input("按回车键退出...")
        return
    
    print("="*50)
    print("🚀 正在启动智慧医疗系统...")
    print("-" * 50)

    # --- 2. 启动 Node.js Web 服务器 (端口 3000) ---
    print("1. 正在启动 Node.js Web 服务 (http://localhost:3000)...")
    use_shell = True if sys.platform.startswith('win') else False
    nodejs_process = None
    try:
        # 启动 Node.js 进程
        nodejs_process = subprocess.Popen(
            ['node', nodejs_script], 
            cwd=current_dir,
            shell=use_shell
        )
    except FileNotFoundError:
        print("❌ 错误：找不到 'node' 命令。请确保 Node.js 已安装并配置到 PATH。")
        input("按回车键退出...")
        return
    except Exception as e:
        print(f"❌ 启动 Node.js 服务失败: {e}")
        input("按回车键退出...")
        return
        
    print("   (请勿关闭弹出的黑色窗口)")
    print("-" * 50)

    # --- 3. 启动 MiniMind 本地模型 server.py ---
    print("2. 正在唤醒 MiniMind 本地模型 (后台服务)...")
    try:
        server_process = subprocess.Popen(
            [sys.executable, server_script], 
            cwd=os.path.dirname(server_script), 
            shell=use_shell
        )
    except Exception as e:
        print(f"❌ 启动 MiniMind 服务失败: {e}")
        # 在失败时尝试终止已启动的服务
        if nodejs_process:
            nodejs_process.terminate()
        input("按回车键退出...")
        return

    # --- 4. 启动用户认证与云端代理服务 ad.py (端口 5001) ---
    ad_process = None
    if os.path.exists(ad_script):
        try:
            print("3. 正在启动用户认证服务 (ad.py, 端口5001)...")
            ad_process = subprocess.Popen(
                [sys.executable, ad_script],
                cwd=current_dir,
                shell=use_shell
            )
        except Exception as e:
            print(f"⚠️ 启动认证服务失败: {e}")

    # --- 5. 等待服务加载 (给它一点时间预热) ---
    print("⏳ 等待所有服务加载 (约 8 秒)...")
    # 增加等待时间，确保 Node.js 和模型都能启动
    time.sleep(8) 

    # --- 6. 自动打开主页 ---
    target_url = 'http://localhost:3000/yiliao.html'
    print(f"4. 正在打开系统主页: {target_url}")
    webbrowser.open(target_url) 
    
    print("="*50)
    print("✅ 系统启动成功！")
    print(f"   -> 主页: {target_url}")
    print("   -> AI 模型服务: http://127.0.0.1:8000 (或其他 MiniMind 默认端口)")
    print("   -> 认证服务: http://127.0.0.1:5001/")
    print("="*50)
    
    # --- 7. 保持主进程运行并处理中断 ---
    try:
        # 等待 MiniMind 进程结束（这是核心 AI 服务）
        server_process.wait()
    except KeyboardInterrupt:
        print("\n正在停止服务...")
    finally:
        # 无论如何，尝试终止所有子进程
        print("正在关闭所有后台服务...")
        server_process.terminate()
        if ad_process:
            ad_process.terminate()
        if nodejs_process:
            nodejs_process.terminate()
        print("所有服务已关闭。")

if __name__ == '__main__':
    main()
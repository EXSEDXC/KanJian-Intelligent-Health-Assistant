import subprocess
import webbrowser
import time
import os
import sys

def main():
    # 获取当前目录路径
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. 定位后端脚本
    server_script = os.path.join(current_dir, 'my_minimind', 'scripts', 'server.py')
    
    if not os.path.exists(server_script):
        print(f"❌ 错误：找不到后端脚本 {server_script}")
        input("按回车键退出...")
        return

    print("="*50)
    print("🚀 正在启动智慧医疗系统...")
    print("1. 正在唤醒 MiniMind 本地模型 (后台服务)...")
    print("   (请勿关闭弹出的黑色窗口，否则 AI 无法回答问题)")
    print("-" * 50)

    # 2. 启动 server.py
    use_shell = True if sys.platform.startswith('win') else False
    try:
        # cwd参数保证了server.py是在它的目录下运行，能找到 ../model
        server_process = subprocess.Popen(
            [sys.executable, server_script], 
            cwd=os.path.dirname(server_script), 
            shell=use_shell
        )
    except Exception as e:
        print(f"❌ 启动服务失败: {e}")
        input("按回车键退出...")
        return

    # 3. 等待模型加载 (给它一点时间预热)
    print("⏳ 等待模型加载 (约 5 秒)...")
    time.sleep(5) 

    # 4. 自动打开主页 (yiliao.html)
    # 注意：这里改成了打开主页，而不是直接进聊天页
    html_file = os.path.join(current_dir, 'yiliao.html')
    
    if os.path.exists(html_file):
        print(f"2. 正在打开系统主页: {html_file}")
        webbrowser.open('file://' + html_file)
    else:
        print(f"⚠️ 警告：找不到主页文件 {html_file}")

    print("="*50)
    print("✅ 系统启动成功！")
    print("   -> 你现在可以在网页浏览，点击【服务】进入 AI 问诊。")
    print("="*50)
    
    # 保持主进程运行，以便监控
    try:
        server_process.wait()
    except KeyboardInterrupt:
        print("\n正在停止服务...")
        server_process.terminate()

if __name__ == '__main__':
    main()
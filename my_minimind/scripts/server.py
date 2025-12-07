import os
import sys
import torch
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from transformers import AutoTokenizer, AutoModelForCausalLM

# --- 路径修正核心逻辑 ---
# 获取当前脚本所在目录 (my_minimind/scripts)
current_dir = os.path.dirname(os.path.abspath(__file__))
# 获取 my_minimind 根目录
root_dir = os.path.dirname(current_dir)
# 将 my_minimind 加入 Python 搜索路径，这样就能 import model.model_vlm 了
sys.path.append(root_dir)

# 现在可以正常导入了
from model.model_vlm import MiniMindVLM, VLMConfig

app = Flask(__name__)
CORS(app) # 允许前端跨域访问

# --- 配置参数 ---
class ModelArgs:
    def __init__(self):
        # 这里的路径是相对于 server.py 运行时的位置
        # 因为我们在 scripts 目录下运行，所以 model 在 ../model
        self.load_from = os.path.join(root_dir, 'model') 
        self.save_dir = os.path.join(root_dir, 'out')
        self.weight = 'sft_vlm'
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.hidden_size = 512
        self.num_hidden_layers = 8
        self.max_seq_len = 8192
        self.use_moe = False
        self.temperature = 0.3 # 可以稍微调低一点，让回答更稳定
        self.top_p = 0.85

args = ModelArgs()
lm_config = VLMConfig(hidden_size=args.hidden_size, num_hidden_layers=args.num_hidden_layers,
                      max_seq_len=args.max_seq_len, use_moe=args.use_moe)

# 全局变量
model = None
tokenizer = None
vision_model = None
preprocess = None

def init_model():
    global model, tokenizer, vision_model, preprocess
    print(f"正在加载模型，路径: {args.load_from}")
    
    tokenizer = AutoTokenizer.from_pretrained(args.load_from, trust_remote_code=True)
    
    # 判断加载方式
    if 'model' in args.load_from and not os.path.exists(os.path.join(args.load_from, 'config.json')):
        # 假设是原生 PyTorch 权重
        moe_path = '_moe' if lm_config.use_moe else ''
        ckp = f'{args.save_dir}/{args.weight}_{lm_config.hidden_size}{moe_path}.pth'
        print(f"Loading from PTH: {ckp}")
        
        # 这里的 vision_model_path 需要指向 clip 模型，通常在 my_minimind/model/vision_model/
        vision_path = os.path.join(root_dir, 'model/vision_model/clip-vit-base-patch16')
        
        model = MiniMindVLM(lm_config, vision_model_path=vision_path)
        state_dict = torch.load(ckp, map_location=args.device)
        model.load_state_dict({k: v for k, v in state_dict.items() if 'mask' not in k}, strict=False)
    else:
        # 假设是 Transformers 格式
        print("Loading from Transformers format...")
        model = AutoModelForCausalLM.from_pretrained(args.load_from, trust_remote_code=True)
        vision_path = os.path.join(root_dir, 'model/vision_model/clip-vit-base-patch16')
        model.vision_encoder, model.processor = MiniMindVLM.get_vision_model(vision_path)

    model = model.eval().to(args.device)
    vision_model = model.vision_encoder.to(args.device)
    preprocess = model.processor
    print(">>> 模型加载完成，服务启动！")

@app.route('/chat', methods=['POST'])
def chat():
    prompt = request.form.get('prompt', '')
    
    # === 1. 严格区分模式 ===
    has_real_image = False
    if 'image' in request.files and request.files['image'].filename != '':
        has_real_image = True
        image_file = request.files['image']
        image = Image.open(image_file.stream).convert('RGB')
        print(">>> [模式] 视觉模式：处理真实图片")
    else:
        print(">>> [模式] 纯文本模式：彻底切断视觉信号")

    # === 2. 构造数据 (关键修改点) ===
    if has_real_image:
        # [有图模式]
        # 1. Prompt 带上标记
        full_prompt = f'{lm_config.image_special_token}\n{prompt}'
        # 2. 计算图片 Tensor
        pixel_values = MiniMindVLM.image2tensor(image, preprocess).to(args.device).unsqueeze(0)
    else:
        # [无图模式] - 终极杀招
        # 1. Prompt 绝对不带标记，并且加上文字指令压制（双重保险）
        full_prompt = f"（系统指令：请忽略视觉感知，仅作为纯文本医疗助手回答问题）\n用户问题：{prompt}"
        # 2. 关键：直接传 None！不要传任何 dummy image！
        # 这样模型内部的 Vision Encoder 就根本不会启动，也就没有“白色幻觉”了
        pixel_values = None 

    messages = [{"role": "user", "content": full_prompt}]
    
    new_prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )[-args.max_seq_len + 1:]
    
    inputs = tokenizer(new_prompt, return_tensors="pt", truncation=True).to(args.device)
    
    # === 3. 推理 ===
    try:
        with torch.no_grad():
            output_ids = model.generate(
                inputs.input_ids,
                max_new_tokens=args.max_seq_len,
                do_sample=True,
                temperature=args.temperature,
                top_p=args.top_p,
                repetition_penalty=1.1, # 顺便加上防复读
                attention_mask=inputs.attention_mask,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
                # 这里的 pixel_values 可能是 Tensor，也可能是 None
                pixel_values=pixel_values 
            )
    except Exception as e:
        # 兜底：万一你的模型版本比较旧，不支持传 None，会报错
        print(f"Error during generation: {e}")
        # 如果报错，说明模型强制要求 pixel_values，那我们只能退回到 dummy image，
        # 但这次我们用【随机噪点图】代替【白图】，防止它联想到医院
        import numpy as np
        print(">>> 模型不支持 None，切换到随机噪点图兜底...")
        random_img = Image.fromarray(np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8))
        pixel_values = MiniMindVLM.image2tensor(random_img, preprocess).to(args.device).unsqueeze(0)
        
        with torch.no_grad():
            output_ids = model.generate(
                inputs.input_ids,
                max_new_tokens=args.max_seq_len,
                do_sample=True,
                temperature=args.temperature,
                top_p=args.top_p,
                repetition_penalty=1.1, # 顺便加上防复读
                attention_mask=inputs.attention_mask,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
                # 这里的 pixel_values 可能是 Tensor，也可能是 None
                pixel_values=pixel_values 
            )

    output = tokenizer.decode(output_ids[0], skip_special_tokens=True)
    
    # === 4. 暴力清洗 (最后的防线) ===
    # 如果模型还是死性不改，开头出现了“该图”、“图片”等字眼，强制切掉
    response = output
    if "assistant" in output:
        response = output.split("assistant")[-1].strip()
    elif prompt in output:
        response = output.split(prompt)[-1].strip()
        
    response = response.replace('<|im_end|>', '').lstrip(':').strip()
    
    # 检测并删除幻觉开头
    hallucination_triggers = ["该图", "这张图", "图片显示", "The image"]
    for trigger in hallucination_triggers:
        if response.startswith(trigger):
            # 找到第一个句号或换行符，把第一句废话删掉
            import re
            response = re.sub(r'^.*?[。！？\n]', '', response).strip()
            print(">>> 检测到幻觉开头，已暴力移除")
            
    return jsonify({"response": response})

if __name__ == '__main__':
    init_model()
    # 监听 5000 端口
    app.run(host='0.0.0.0', port=5000)
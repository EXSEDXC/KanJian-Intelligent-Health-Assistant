// 图片上传预览和识别
document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('image-input');
    const imagePreview = document.getElementById('image-preview');
    const recognizeBtn = document.getElementById('recognize-btn');
    const recognizeResult = document.getElementById('recognize-result');

    let currentImageDataUrl = '';

    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    currentImageDataUrl = evt.target.result;
                    imagePreview.src = currentImageDataUrl;
                    imagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (recognizeBtn) {
        recognizeBtn.addEventListener('click', function() {
            if (!currentImageDataUrl) {
                recognizeResult.textContent = '请先选择图片';
                return;
            }
            recognizeResult.textContent = '识别中...';
                    // 调用后端API识别图片
                    const formData = new FormData();
                    // 将base64转为Blob
                    fetch(currentImageDataUrl)
                        .then(res => res.blob())
                        .then(blob => {
                            formData.append('image', blob, 'upload.png');
                            return fetch('/api/recognize', {
                                method: 'POST',
                                body: formData
                            });
                        })
                        .then(response => response.json())
                        .then(data => {
                            recognizeResult.textContent = data.result || '识别失败';
                        })
                        .catch(err => {
                            recognizeResult.textContent = '识别出错';
                        });
        });
    }
});
/**
 * 智慧医疗平台基础交互逻辑
 * 负责页面通用交互、组件状态管理
 */
document.addEventListener('DOMContentLoaded', function() {
    // 1. 移动端菜单切换逻辑
    initMobileMenu();

    // 2. 组件悬停动画效果
    initHoverEffects();

    // 3. 搜索框交互效果
    initSearchBox();

    // 4. 表单提交处理
    initFormSubmission();

    // 5. 健康数据图表初始化
    initHealthChart();
});

/**
 * 移动端菜单切换
 */
function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (!menuToggle || !navLinks) return;

    menuToggle.addEventListener('click', function() {
        navLinks.classList.toggle('active');

        // 动态添加移动端登录按钮
        if (navLinks.classList.contains('active') && !document.querySelector('.mobile-auth')) {
            const mobileAuth = document.createElement('div');
            mobileAuth.className = 'mobile-auth';
            mobileAuth.innerHTML = `
                <a href="#" class="btn btn-outline" style="display: block; text-align: center;">登录</a>
                <a href="#" class="btn btn-primary" style="display: block; text-align: center;">注册</a>
            `;
            navLinks.appendChild(mobileAuth);
        }
    });
}

/**
 * 组件悬停动画效果
 */
function initHoverEffects() {
    // 服务卡片悬停效果
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px)';
            card.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.1)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.05)';
        });
    });

    // 医生卡片悬停效果
    const doctorCards = document.querySelectorAll('.doctor-card');
    doctorCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
            card.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.1)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.05)';
        });
    });
}

/**
 * 搜索框交互效果
 */
function initSearchBox() {
    const searchInput = document.querySelector('.search-box input');
    if (!searchInput) return;

    searchInput.addEventListener('focus', () => {
        searchInput.parentElement.style.transform = 'scale(1.02)';
    });

    searchInput.addEventListener('blur', () => {
        searchInput.parentElement.style.transform = 'scale(1)';
    });
}

/**
 * 表单提交处理
 */
function initFormSubmission() {
    const appointmentForm = document.querySelector('.appointment-form form');
    if (!appointmentForm) return;

    appointmentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 简单表单验证
        const name = document.getElementById('name').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const department = document.getElementById('department').value;
        const date = document.getElementById('date').value;

        if (!name || !phone || !department || !date) {
            alert('请填写完整的预约信息');
            return;
        }

        // 模拟提交成功
        alert('预约信息已提交，我们的医疗顾问将尽快联系您！');
        this.reset();
    });
}

/**
 * 健康数据图表初始化
 */
function initHealthChart() {
    const healthChart = document.getElementById('healthChart');
    if (!healthChart) return;

    const ctx = healthChart.getContext('2d');
    if (!ctx) return;

    // 绘制折线图（模拟心率数据）
    drawHeartRateChart(ctx);
}

/**
 * 绘制心率折线图
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 */
function drawHeartRateChart(ctx) {
    // 图表基础配置
    const startX = 50;
    const startY = 250;
    const xInterval = 50;
    const dataPoints = [220, 180, 200, 160, 190, 150, 170]; // 模拟心率数据

    // 绘制折线
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2a7de1';
    ctx.moveTo(startX, startY);

    // 连接数据点
    dataPoints.forEach((point, index) => {
        ctx.lineTo(startX + (index * xInterval), startY - point);
    });
    ctx.stroke();

    // 绘制数据点
    ctx.fillStyle = '#2a7de1';
    dataPoints.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(startX + (index * xInterval), startY - point, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    // 绘制坐标轴
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ccc';
    ctx.moveTo(30, 50);
    ctx.lineTo(30, 250);
    ctx.lineTo(400, 250);
    ctx.stroke();

    // 添加标签
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.fillText('心率(bpm)', 10, 150);
    ctx.fillText('时间', 200, 270);

    // 添加日期标签
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    days.forEach((day, index) => {
        ctx.fillText(day, startX - 10 + (index * xInterval), 265);
    });
}
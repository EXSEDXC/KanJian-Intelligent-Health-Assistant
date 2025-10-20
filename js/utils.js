/**
 * 智慧医疗平台工具函数库
 * 包含数据处理、本地存储、格式转换等通用功能
 */
const SmartMedUtils = {
    /**
     * 格式化日期为"YYYY-MM-DD"格式
     * @param {Date} date - 日期对象
     * @returns {string} 格式化后的日期字符串
     */
    formatDate(date) {
        if (!(date instanceof Date)) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * 验证手机号格式
     * @param {string} phone - 手机号
     * @returns {boolean} 格式是否正确
     */
    validatePhone(phone) {
        const reg = /^1[3-9]\d{9}$/;
        return reg.test(phone.trim());
    },

    /**
     * 本地存储工具 - 设置数据
     * @param {string} key - 存储键名
     * @param {any} value - 存储值（自动转换为JSON）
     */
    setStorage(key, value) {
        try {
            const data = typeof value === 'object' ? JSON.stringify(value) : value;
            localStorage.setItem(key, data);
        } catch (e) {
            console.error('本地存储设置失败:', e);
        }
    },

    /**
     * 本地存储工具 - 获取数据
     * @param {string} key - 存储键名
     * @param {boolean} isParse - 是否需要JSON解析
     * @returns {any} 存储的值
     */
    getStorage(key, isParse = false) {
        try {
            const data = localStorage.getItem(key);
            if (!data) return null;
            return isParse ? JSON.parse(data) : data;
        } catch (e) {
            console.error('本地存储获取失败:', e);
            return null;
        }
    },

    /**
     * 本地存储工具 - 删除数据
     * @param {string} key - 存储键名
     */
    removeStorage(key) {
        localStorage.removeItem(key);
    },

    /**
     * 显示提示消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型（success/error/info）
     * @param {number} duration - 显示时长（毫秒）
     */
    showToast(message, type = 'info', duration = 3000) {
        // 检查是否已存在toast
        let toast = document.querySelector('.smartmed-toast');
        if (toast) {
            clearTimeout(toast.timer);
            document.body.removeChild(toast);
        }

        // 创建新toast
        toast = document.createElement('div');
        toast.className = `smartmed-toast toast-${type}`;
        
        // 设置样式
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.padding = '12px 20px';
        toast.style.borderRadius = '5px';
        toast.style.color = 'white';
        toast.style.zIndex = '9999';
        toast.style.boxShadow = '0 3px 10px rgba(0,0,0,0.2)';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';

        // 设置类型样式
        switch(type) {
            case 'success':
                toast.style.backgroundColor = '#28a745';
                break;
            case 'error':
                toast.style.backgroundColor = '#dc3545';
                break;
            default:
                toast.style.backgroundColor = '#2a7de1';
        }

        toast.textContent = message;
        document.body.appendChild(toast);

        // 显示动画
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 10);

        // 自动关闭
        toast.timer = setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, duration);
    },

    /**
     * 计算进度百分比
     * @param {number} current - 当前值
     * @param {number} total - 目标值
     * @returns {number} 百分比（保留两位小数）
     */
    calculateProgress(current, total) {
        if (total === 0) return 0;
        const progress = (current / total) * 100;
        return Math.round(progress * 100) / 100;
    }
};

// 暴露到全局
window.SmartMedUtils = SmartMedUtils;
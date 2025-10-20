/**
 * 智慧医疗平台API请求封装
 * 统一处理请求头、响应拦截、错误处理
 */
const SmartMedAPI = {
    // API基础地址
    baseUrl: 'https://api.smartmed.com/v1',

    /**
     * 通用请求函数
     * @param {string} url - 请求路径
     * @param {string} method - 请求方法（GET/POST/PUT/DELETE）
     * @param {object} data - 请求数据（POST/PUT）
     * @param {object} params - URL参数（GET）
     * @returns {Promise} 请求Promise
     */
    async request(url, method = 'GET', data = null, params = null) {
        // 构建完整URL
        let fullUrl = `${this.baseUrl}${url}`;
        
        // 处理URL参数
        if (params && method === 'GET') {
            const searchParams = new URLSearchParams(params);
            fullUrl += `?${searchParams.toString()}`;
        }

        // 构建请求配置
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                // 自动添加认证令牌（如有）
                ...this.getAuthHeader()
            }
        };

        // 处理请求数据
        if (data && ['POST', 'PUT', 'DELETE'].includes(method)) {
            config.body = JSON.stringify(data);
        }

        try {
            // 发送请求
            const response = await fetch(fullUrl, config);
            
            // 处理响应
            return await this.handleResponse(response);
        } catch (error) {
            // 处理网络错误
            SmartMedUtils.showToast('网络异常，请检查网络连接', 'error');
            console.error('API请求失败:', error);
            throw error;
        }
    },

    /**
     * 获取认证请求头
     * @returns {object} 认证头
     */
    getAuthHeader() {
        const token = SmartMedUtils.getStorage('auth_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },

    /**
     * 处理响应数据
     * @param {Response} response - 响应对象
     * @returns {Promise} 处理后的响应数据
     */
    async handleResponse(response) {
        // 解析响应数据
        let responseData;
        try {
            responseData = await response.json();
        } catch (e) {
            responseData = { code: response.status, message: '响应格式错误' };
        }

        // 处理HTTP错误
        if (!response.ok) {
            const errorMsg = responseData.message || `请求失败（${response.status}）`;
            SmartMedUtils.showToast(errorMsg, 'error');
            throw new Error(errorMsg);
        }

        // 处理业务错误（假设后端返回code=0为成功）
        if (responseData.code !== 0) {
            SmartMedUtils.showToast(responseData.message || '业务处理失败', 'error');
            throw new Error(responseData.message);
        }

        return responseData.data;
    },

    // ------------------------------
    // 业务API接口
    // ------------------------------

    /**
     * 用户登录
     * @param {object} data - 登录数据（phone/password）
     * @returns {Promise} 登录结果
     */
    login(data) {
        return this.request('/user/login', 'POST', data);
    },

    /**
     * 用户注册
     * @param {object} data - 注册数据（name/phone/password）
     * @returns {Promise} 注册结果
     */
    register(data) {
        return this.request('/user/register', 'POST', data);
    },

    /**
     * 获取健康数据
     * @param {string} userId - 用户ID
     * @param {string} type - 数据类型（heartRate/step/sleep）
     * @param {string} startDate - 开始日期
     * @param {string} endDate - 结束日期
     * @returns {Promise} 健康数据
     */
    getHealthData(userId, type, startDate, endDate) {
        return this.request('/health/data', 'GET', null, {
            userId,
            type,
            startDate,
            endDate
        });
    },

    /**
     * 提交预约信息
     * @param {object} data - 预约数据
     * @returns {Promise} 预约结果
     */
    submitAppointment(data) {
        return this.request('/appointment/submit', 'POST', data);
    },

    /**
     * 搜索医生/科室
     * @param {string} keyword - 搜索关键词
     * @param {string} type - 搜索类型（doctor/department）
     * @returns {Promise} 搜索结果
     */
    search(keyword, type) {
        return this.request('/search', 'GET', null, {
            keyword,
            type
        });
    }
};

// 暴露到全局
window.SmartMedAPI = SmartMedAPI;
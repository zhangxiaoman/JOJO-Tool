// ==UserScript==
// @name         Redmine 故事要点编辑器
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  将Redmine需求列表中的故事要点列添加编辑功能
// @author       章小慢
// @match        *://*/projects/*/issues*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 添加自定义样式
    GM_addStyle(`
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
        .story-points-input {
            width: 60px;
            padding: 2px 4px;
            text-align: center;
            border: 1px solid #ddd;
            border-radius: 3px;
            font-size: 12px;
        }
        .story-points-input:focus {
            outline: none;
            border-color: #4a89dc;
            box-shadow: 0 0 0 2px rgba(74, 137, 220, 0.2);
        }
        .story-points-actions {
            height:28px;
            display: inline-flex;
            align-items: center;
            gap: 2px; /* 缩小间距 */
            margin-left: 2px;
        }
        .story-points-btn {
            padding: 1px 4px; /* 缩小按钮大小 */
            font-size: 10px; /* 缩小字体 */
            border: 1px solid transparent;
            border-radius: 3px;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
            line-height: 1.2;
        }
        .story-points-btn:hover:not(:disabled) {
            opacity: 0.85;
        }
        .story-points-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .story-points-edit-btn {
            background-color: #4a89dc;
        }
        .story-points-save-btn {
            background-color: #28a745;
        }
        .story-points-cancel-btn {
            background-color: #6c757d;
        }
        .story-points-text {
            min-width: 20px;
            display: inline-block;
            text-align: center;
        }
        .story-points-input.invalid {
            border-color: #dc3545;
            box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.2);
        }
    `);

    // 验证故事要点输入是否有效
    function isValidStoryPoint(value) {
        const num = parseInt(value);
        return !isNaN(num) && num >= 0;
    }

    // 替换故事要点TD为可编辑组件
    function initializeStoryPointsEditors() {
        // 不使用:has()选择器，改用JavaScript过滤
        const storyPointsCells = document.querySelectorAll('td.story_points');

        storyPointsCells.forEach(cell => {
            // 跳过已有容器的单元格，避免重复初始化
            if (cell.querySelector('.story-points-container')) {
                return;
            }

            // 获取对应的issue ID
            const issueRow = cell.closest('tr[id^="issue-"]');
            if (!issueRow) return;

            const issueId = issueRow.id.replace('issue-', '');
            // 不初始化为0，保留原始值
            const currentPoints = cell.textContent.trim();

            // 创建容器元素
            const container = document.createElement('div');
            container.className = 'story-points-container';
            container.dataset.issueId = issueId;
            container.dataset.originalPoints = currentPoints;

            // 创建文本显示元素
            const textElement = document.createElement('span');
            textElement.className = 'story-points-text';
            textElement.textContent = currentPoints || '';

            // 创建调整按钮
            const editBtn = document.createElement('button');
            editBtn.className = 'story-points-btn story-points-edit-btn';
            editBtn.textContent = '调整';
            editBtn.addEventListener('click', function() {
                enableEditing(container);
            });

            // 创建操作按钮容器
            const actionsContainer = document.createElement('span');
            actionsContainer.className = 'story-points-actions';
            actionsContainer.appendChild(editBtn);

            // 组装容器
            container.appendChild(textElement);
            container.appendChild(actionsContainer);

            // 清除原有内容并添加容器
            cell.textContent = '';
            cell.appendChild(container);
        });
    }

    // 启用编辑模式
    function enableEditing(container) {
        const issueId = container.dataset.issueId;
        const originalPoints = container.dataset.originalPoints;

        // 清空容器
        container.innerHTML = '';

        // 创建输入框 - 移除step属性
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'story-points-input';
        input.value = originalPoints || '';
        input.min = '0';
        // 移除max和step属性

        // 创建保存按钮
        const saveBtn = document.createElement('button');
        saveBtn.className = 'story-points-btn story-points-save-btn';
        saveBtn.textContent = '确认';
        saveBtn.disabled = true; // 初始禁用

        // 创建取消按钮
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'story-points-btn story-points-cancel-btn';
        cancelBtn.textContent = '取消';

        // 验证函数
        function validateInput() {
            const value = input.value;
            const hasChanged = value !== originalPoints;
            const isValid = !value || isValidStoryPoint(value);

            // 更新输入框样式
            if (value && !isValidStoryPoint(value)) {
                input.classList.add('invalid');
            } else {
                input.classList.remove('invalid');
            }

            // 更新保存按钮状态
            saveBtn.disabled = !hasChanged || (value && !isValidStoryPoint(value));
        }

        // 监听输入变化
        input.addEventListener('input', function() {
            // 限制只能输入数字
            this.value = this.value.replace(/[^0-9]/g, '');
            validateInput();
        });

        // 监听失去焦点事件，确保输入符合要求
        input.addEventListener('blur', function() {
            // 如果输入为空或无效，重置为原始值
            if (this.value && !isValidStoryPoint(this.value)) {
                this.value = originalPoints || '';
                validateInput();
            }
        });

        // 监听保存事件
        saveBtn.addEventListener('click', function() {
            if (!this.disabled) {
                updateStoryPoints(issueId, input.value);
                container.dataset.originalPoints = input.value;
                disableEditing(container, input.value);
            }
        });

        // 监听取消事件
        cancelBtn.addEventListener('click', function() {
            disableEditing(container, originalPoints);
        });

        // 监听回车键保存和ESC键取消
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !saveBtn.disabled) {
                saveBtn.click();
            } else if (e.key === 'Escape') {
                cancelBtn.click();
            }
        });

        // 创建操作按钮容器
        const actionsContainer = document.createElement('span');
        actionsContainer.className = 'story-points-actions';
        actionsContainer.appendChild(saveBtn);
        actionsContainer.appendChild(cancelBtn);
        // 移除提示文本元素

        // 组装容器
        container.appendChild(input);
        container.appendChild(actionsContainer);

        // 自动聚焦输入框
        input.focus();
        // 选中输入框内容，方便直接修改
        if (input.value) {
            input.select();
        }
    }

    // 禁用编辑模式
    function disableEditing(container, points) {
        // 清空容器
        container.innerHTML = '';

        // 更新原始值
        container.dataset.originalPoints = points;

        // 创建文本显示元素
        const textElement = document.createElement('span');
        textElement.className = 'story-points-text';
        textElement.textContent = points || '';

        // 创建调整按钮
        const editBtn = document.createElement('button');
        editBtn.className = 'story-points-btn story-points-edit-btn';
        editBtn.textContent = '调整';
        editBtn.addEventListener('click', function() {
            enableEditing(container);
        });

        // 创建操作按钮容器
        const actionsContainer = document.createElement('span');
        actionsContainer.className = 'story-points-actions';
        actionsContainer.appendChild(editBtn);

        // 组装容器
        container.appendChild(textElement);
        container.appendChild(actionsContainer);
    }

    // 更新故事要点
    function updateStoryPoints(issueId, storyPoints) {
        // 确保输入是有效的数字，如果为空则设为0
        const points = storyPoints ? parseInt(storyPoints) || 0 : 0;

        // 获取CSRF token
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (!csrfToken) {
            console.error('未找到CSRF token');
            alert('系统错误：未找到CSRF token');
            return;
        }

        // 构建请求URL
        const url = `/issues/${issueId}`;

        // 构建表单数据
        const formData = new FormData();
        formData.append('utf8', '✓');
        formData.append('authenticity_token', csrfToken);
        formData.append('issue[agile_data_attributes][story_points]', points);
        formData.append('_method', 'patch');

        // 发送POST请求更新问题
        fetch(url, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('更新失败');
            }
            console.log('故事要点更新成功');
        })
        .catch(error => {
            console.error('更新故事要点时出错:', error);
            alert('更新故事要点失败，请重试');
        });
    }

    // 等待页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeStoryPointsEditors);
    } else {
        initializeStoryPointsEditors();
    }

    // 监听可能的动态内容加载（例如分页、过滤等）
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                // 检查是否有新的故事要点TD被添加
                let needsInitialization = false;

                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const node = mutation.addedNodes[i];
                    if (node.nodeType === 1) {
                        // 检查节点本身是否是故事要点单元格
                        if (node.classList.contains('story_points') && !node.querySelector('.story-points-container')) {
                            needsInitialization = true;
                            break;
                        }

                        // 检查节点内是否包含故事要点单元格
                        const newStoryPointsCells = node.querySelectorAll('td.story_points');
                        for (let j = 0; j < newStoryPointsCells.length; j++) {
                            if (!newStoryPointsCells[j].querySelector('.story-points-container')) {
                                needsInitialization = true;
                                break;
                            }
                        }

                        if (needsInitialization) break;
                    }
                }

                if (needsInitialization) {
                    initializeStoryPointsEditors();
                }
            }
        });
    });

    // 开始观察表格区域
    const issuesTable = document.querySelector('.issues');
    if (issuesTable) {
        observer.observe(issuesTable, {
            childList: true,
            subtree: true
        });
    }
})();
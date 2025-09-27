// ==UserScript==
// @name         Redmine 需求拖拽排序工具
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  为Redmine需求列表添加拖拽排序功能，自动生成序号并批量更新
// @author       章小慢
// @match        https://t.xxxxxx.co/projects/*/issues*
// @grant        GM_addStyle
// @require      https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js
// ==/UserScript==

(function() {
    'use strict';

    // 添加样式
    GM_addStyle(`
        .drag-handle {
            cursor: move;
            padding: 5px;
            margin-right: 5px;
            color: #999;
        }
        .drag-handle:hover {
            color: #666;
        }
        .sort-control {
            margin: 10px 0;
            padding: 10px;
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .sort-control button {
            padding: 6px 12px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .sort-control button:hover {
            background-color: #0056b3;
        }
        .sort-control button:disabled {
            background-color: #6c757d;
            cursor: not-allowed;
        }
        .sort-control .status {
            color: #666;
            font-size: 14px;
        }
        .issue-subject-number {
            font-weight: bold;
            color: #007bff;
            margin-right: 5px;
        }
        /* Loading覆盖层样式 */
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(255, 255, 255, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            visibility: hidden;
            opacity: 0;
            transition: visibility 0s linear 0.25s, opacity 0.25s;
        }
        .loading-overlay.visible {
            visibility: visible;
            opacity: 1;
            transition-delay: 0s;
        }
        .loading-content {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            text-align: center;
            min-width: 250px;
        }
        .loading-spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #007bff;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .loading-text {
            font-size: 16px;
            color: #333;
        }
        .loading-progress {
            font-size: 14px;
            color: #666;
            margin-top: 8px;
        }
    `);

    // 等待页面加载完成
    function waitForElement(selector, callback) {
        if (document.querySelector(selector)) {
            callback();
        } else {
            setTimeout(() => waitForElement(selector, callback), 100);
        }
    }

    let sortable = null;
    let originalSubjects = new Map();
    let isDraggingEnabled = false;
    let loadingOverlay = null;
    let loadingProgressText = null;

    // 创建Loading覆盖层
    function createLoadingOverlay() {
        loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        
        const loadingContent = document.createElement('div');
        loadingContent.className = 'loading-content';
        
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        
        const text = document.createElement('div');
        text.className = 'loading-text';
        text.textContent = '正在更新需求...';
        
        loadingProgressText = document.createElement('div');
        loadingProgressText.className = 'loading-progress';
        loadingProgressText.textContent = '准备中...';
        
        loadingContent.appendChild(spinner);
        loadingContent.appendChild(text);
        loadingContent.appendChild(loadingProgressText);
        loadingOverlay.appendChild(loadingContent);
        
        document.body.appendChild(loadingOverlay);
    }

    // 显示Loading
    function showLoading() {
        if (!loadingOverlay) {
            createLoadingOverlay();
        }
        loadingOverlay.classList.add('visible');
    }

    // 隐藏Loading
    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('visible');
        }
    }

    // 更新Loading进度
    function updateLoadingProgress(current, total) {
        if (loadingProgressText) {
            loadingProgressText.textContent = `正在更新: ${current}/${total}`;
        }
    }

    // 主函数
    function initSorting() {
        // 添加控制按钮
        const issueListTable = document.querySelector('table.list.issues');
        if (!issueListTable) return;

        const controlContainer = document.createElement('div');
        controlContainer.className = 'sort-control';
        
        const startSortBtn = document.createElement('button');
        startSortBtn.textContent = '开始拖拽排序';
        startSortBtn.id = 'start-sort-btn';
        
        const saveSortBtn = document.createElement('button');
        saveSortBtn.textContent = '保存排序并更新';
        saveSortBtn.id = 'save-sort-btn';
        saveSortBtn.disabled = true;
        
        const cancelSortBtn = document.createElement('button');
        cancelSortBtn.textContent = '取消排序';
        cancelSortBtn.id = 'cancel-sort-btn';
        cancelSortBtn.disabled = true;
        
        const statusText = document.createElement('span');
        statusText.className = 'status';
        statusText.textContent = '就绪';
        
        controlContainer.appendChild(startSortBtn);
        controlContainer.appendChild(saveSortBtn);
        controlContainer.appendChild(cancelSortBtn);
        controlContainer.appendChild(statusText);
        
        // 插入到表格上方
        issueListTable.parentNode.insertBefore(controlContainer, issueListTable);

        // 获取表格主体和行
        const tbody = issueListTable.querySelector('tbody');
        const issueRows = tbody.querySelectorAll('tr[id^="issue-"]');

    // 开始排序按钮事件
        startSortBtn.addEventListener('click', () => {
            if (isDraggingEnabled) return;
            
            console.log('启用拖拽排序模式');
            isDraggingEnabled = true;
            startSortBtn.disabled = true;
            saveSortBtn.disabled = false;
            cancelSortBtn.disabled = false;
            statusText.textContent = '拖拽模式已启用';
            
            // 保存原始主题文本
            issueRows.forEach(row => {
                const issueId = row.id.replace('issue-', '');
                const subjectCell = row.querySelector('.subject');
                const subjectLink = subjectCell.querySelector('a');
                originalSubjects.set(issueId, subjectLink.textContent);
                console.log(`保存需求 ${issueId} 的原始标题: ${subjectLink.textContent}`);
                
                // 添加拖拽手柄
                const dragHandle = document.createElement('span');
                dragHandle.className = 'drag-handle';
                dragHandle.textContent = '☰';
                subjectLink.parentNode.insertBefore(dragHandle, subjectLink);
            });

            // 初始化Sortable
            console.log('初始化Sortable拖拽组件');
            sortable = new Sortable(tbody, {
                handle: '.drag-handle',
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: () => {
                    // 拖拽结束后更新序号
                    updateNumbers();
                }
            });
        });

        // 保存排序按钮事件
        saveSortBtn.addEventListener('click', async () => {
            console.log('开始保存排序结果');
            saveSortBtn.disabled = true;
            statusText.textContent = '正在更新...';
            
            try {
                const sortedRows = tbody.querySelectorAll('tr[id^="issue-"]');
                let updatedCount = 0;
                const itemsToUpdate = [];
                
                // 收集需要更新的需求
                sortedRows.forEach((row, index) => {
                    const issueId = row.id.replace('issue-', '');
                    const subjectCell = row.querySelector('.subject');
                    const subjectLink = subjectCell.querySelector('a');
                    const newSubject = subjectLink.textContent;
                    const originalSubject = originalSubjects.get(issueId);
                    
                    // 检查序号是否发生变化
                    const hasChanged = newSubject !== originalSubject;
                    
                    if (hasChanged) {
                        console.log(`需求 ${issueId} 的序号已变更: 从 "${originalSubject}" 变更为 "${newSubject}"`);
                        itemsToUpdate.push({ issueId, newSubject });
                        updatedCount++;
                    } else {
                        console.log(`需求 ${issueId} 的序号未变更，跳过更新`);
                    }
                });
                
                console.log(`共需要更新 ${updatedCount} 个需求`);
                
                if (itemsToUpdate.length > 0) {
                    // 显示loading效果
                    showLoading();
                    let completedCount = 0;
                    
                    // 逐一更新每个需求，并显示进度
                    for (const item of itemsToUpdate) {
                        await updateIssueSubject(item.issueId, item.newSubject);
                        completedCount++;
                        updateLoadingProgress(completedCount, itemsToUpdate.length);
                    }
                    
                    // 隐藏loading
                    hideLoading();
                    statusText.textContent = `更新完成，成功更新了 ${updatedCount} 个需求，页面即将刷新...`;
                } else {
                    statusText.textContent = '没有需求序号发生变化，无需更新';
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                    return;
                }
                
                // 更新完成后刷新页面
                setTimeout(() => {
                    console.log('更新完成，刷新页面');
                    location.reload();
                }, 1000);
            } catch (error) {
                console.error('更新失败:', error);
                statusText.textContent = '更新失败，请重试';
                saveSortBtn.disabled = false;
                // 出错时隐藏loading
                hideLoading();
            }
        });

    // 取消排序按钮事件
        cancelSortBtn.addEventListener('click', () => {
            console.log('取消排序操作');
            resetSorting();
            statusText.textContent = '已取消';
        });
    }

    // 更新序号
    function updateNumbers() {
        console.log('更新需求序号');
        const tbody = document.querySelector('table.list.issues tbody');
        const sortedRows = tbody.querySelectorAll('tr[id^="issue-"]');
        
        sortedRows.forEach((row, index) => {
            const issueId = row.id.replace('issue-', '');
            const subjectCell = row.querySelector('.subject');
            const subjectLink = subjectCell.querySelector('a');
            const originalSubject = originalSubjects.get(issueId);
            
            // 移除可能已存在的序号
            let cleanSubject = originalSubject;
            if (originalSubject.match(/^\d{1,2}\s*/)) {
                cleanSubject = originalSubject.replace(/^\d{1,2}\s*/, '');
            }
            
            // 生成序号，小于10时用0填充
            const sequenceNumber = (index + 1).toString().padStart(2, '0');
            
            // 添加序号
            subjectLink.textContent = `${sequenceNumber} ${cleanSubject}`;
            console.log(`更新需求 ${issueId} 的序号为: ${sequenceNumber}`);
        });
    }

    // 重置排序状态
    function resetSorting() {
        console.log('重置排序状态');
        if (sortable) {
            console.log('销毁Sortable组件');
            sortable.destroy();
            sortable = null;
        }
        
        // 移除拖拽手柄并恢复原始主题
        const issueRows = document.querySelectorAll('tr[id^="issue-"]');
        issueRows.forEach(row => {
            const issueId = row.id.replace('issue-', '');
            const subjectCell = row.querySelector('.subject');
            const subjectLink = subjectCell.querySelector('a');
            const dragHandle = subjectCell.querySelector('.drag-handle');
            
            if (dragHandle) {
                dragHandle.remove();
            }
            
            if (originalSubjects.has(issueId)) {
                subjectLink.textContent = originalSubjects.get(issueId);
                console.log(`恢复需求 ${issueId} 的原始标题`);
            }
        });
        
        originalSubjects.clear();
        console.log('清空原始标题缓存');
        isDraggingEnabled = false;
        
        document.getElementById('start-sort-btn').disabled = false;
        document.getElementById('save-sort-btn').disabled = true;
        document.getElementById('cancel-sort-btn').disabled = true;
    }

    // 更新问题主题
    async function updateIssueSubject(issueId, newSubject) {
        console.log(`开始更新需求 ${issueId} 的主题`);
        // 获取CSRF token
        const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
        
        // 构建表单数据
        const formData = new FormData();
        formData.append('utf8', '✓');
        formData.append('authenticity_token', csrfToken);
        formData.append('issue[subject]', newSubject);
        formData.append('_method', 'patch');
        
        // 发送PUT请求更新问题
        const response = await fetch(`/issues/${issueId}`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.error(`更新需求 ${issueId} 失败，HTTP状态: ${response.status}`);
            throw new Error(`更新问题${issueId}失败: ${response.status}`);
        }
        
        console.log(`需求 ${issueId} 更新成功`);
    }

    // 等待表格加载完成后初始化
    waitForElement('table.list.issues', initSorting);

})();
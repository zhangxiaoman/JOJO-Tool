// ==UserScript==
// @name         Redmine测试时间提取器
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  自动识别Redmine需求详情中的子任务，提取提测时间、FAT测试和UAT测试的起止时间，并在需求列表页面添加悬停效果显示时间信息
// @author       You
// @match        *://*/issues/*
// @match        *://*/projects/*/issues*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 判断当前页面类型
    function isIssueListPage() {
        return window.location.href.includes('/projects/') && window.location.href.includes('/issues');
    }

    function isIssueDetailPage() {
        return /\/issues\/\d+$/.test(window.location.pathname);
    }

    // 等待页面加载完成
    window.addEventListener('load', function() {
        if (isIssueListPage()) {
            // 需求列表页面 - 添加悬停效果
            initIssueListHover();
        } else if (isIssueDetailPage()) {
            // 需求详情页面 - 显示时间信息框
            displayTestTimesInDetailPage();
        }
    });

    // 初始化需求列表的排期按钮
    function initIssueListHover() {
        // 创建全局的提示元素
        const tooltip = document.createElement('div');
        tooltip.id = 'test-time-tooltip';
        tooltip.style.cssText = `
            position: fixed;
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 15px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            display: none;
            font-size: 13px;
            max-width: 350px;
            word-break: break-all;
            white-space: normal;
        `;
        document.body.appendChild(tooltip);

        // 添加ESC键关闭功能
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                tooltip.style.display = 'none';
            }
        });

        // 获取表格
        const issueTable = document.querySelector('table.issues');
        if (!issueTable) return;

        // 为表头添加排期列
        const headerRow = issueTable.querySelector('thead tr');
        if (headerRow) {
            const headerCell = document.createElement('th');
            headerCell.textContent = '排期';
            headerCell.style.textAlign = 'center';
            headerCell.style.width = '60px';
            headerRow.appendChild(headerCell);
        }

        // 获取所有需求行
        const issueRows = document.querySelectorAll('table.issues tr.issue');
        
        issueRows.forEach(row => {
            const issueLink = row.querySelector('.subject a');
            if (issueLink && issueLink.href) {
                const issueId = extractIssueId(issueLink.href);
                
                // 创建一个新的单元格放置排期按钮
                const actionCell = document.createElement('td');
                actionCell.style.textAlign = 'center';
                
                // 创建排期按钮
                const scheduleButton = document.createElement('button');
                scheduleButton.textContent = '排期';
                scheduleButton.className = 'test-schedule-btn';
                scheduleButton.style.cssText = `
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    padding: 3px 8px;
                    font-size: 11px;
                    cursor: pointer;
                `;
                
                // 为按钮添加点击事件
                scheduleButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // 异步获取子任务时间信息
                    fetchIssueDetails(issueId).then(times => {
                        if (times) {
                            // 显示提示框
                            showTooltip(e, times);
                        }
                    }).catch(error => {
                        console.error('获取需求详情失败:', error);
                    });
                });
                
                // 将按钮添加到单元格中
                actionCell.appendChild(scheduleButton);
                // 将单元格添加到行中
                row.appendChild(actionCell);
            }
        });
    }

    // 从URL提取需求ID
    function extractIssueId(url) {
        const match = url.match(/\/issues\/(\d+)/);
        return match ? match[1] : null;
    }

    // 获取需求详情中的测试时间信息
    function fetchIssueDetails(issueId) {
        return new Promise((resolve, reject) => {
            // 发送请求获取需求详情页面
            fetch(`/issues/${issueId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('网络响应错误');
                    }
                    return response.text();
                })
                .then(html => {
                    // 创建临时DOM来解析HTML
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    
                    // 提取测试时间信息
                    const times = extractTestTimesFromDOM(doc);
                    resolve(times);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    // 提取测试时间信息
    function extractTestTimesFromDOM(doc) {
        const times = {
            submitTime: null,
            fatStartTime: null,
            fatEndTime: null,
            uatStartTime: null,
            uatEndTime: null
        };
        
        // 获取所有子任务行
        const issueRows = doc.querySelectorAll('#issue_tree table.list.issues tr.issue');
        
        issueRows.forEach(row => {
            const subjectCell = row.querySelector('.subject');
            const subjectText = subjectCell ? subjectCell.textContent.toLowerCase() : '';
            const startDateCell = row.querySelector('.start_date');
            const dueDateCell = row.querySelector('.due_date');
            
            if (startDateCell && dueDateCell) {
                const startDate = startDateCell.textContent.trim();
                const dueDate = dueDateCell.textContent.trim();
                
                // 提取提测时间（冒烟测试的开始时间）
                if (subjectText.includes('冒烟') && !times.submitTime) {
                    times.submitTime = startDate;
                }
                
                // 提取FAT测试时间
                if (subjectText.includes('fat')) {
                    times.fatStartTime = startDate;
                    times.fatEndTime = dueDate;
                }
                
                // 提取UAT测试时间
                if (subjectText.includes('uat')) {
                    times.uatStartTime = startDate;
                    times.uatEndTime = dueDate;
                }
            }
        });
        
        return times;
    }

    // 显示提示框
    function showTooltip(event, times) {
        const tooltip = document.getElementById('test-time-tooltip');
        
        // 构建提示内容，优化格式和间距
        let content = '<div style="font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 8px;">测试时间信息</div>';
        content += `<div style="margin-bottom: 8px; line-height: 1.4;"><strong>提测时间：</strong><span>${times.submitTime || '未找到'}</span></div>`;
        content += `<div style="margin-bottom: 8px; line-height: 1.4;"><strong>FAT测试：</strong><span>${times.fatStartTime ? `${times.fatStartTime} 至 ${times.fatEndTime}` : '未找到'}</span></div>`;
        content += `<div style="line-height: 1.4;"><strong>UAT测试：</strong><span>${times.uatStartTime ? `${times.uatStartTime} 至 ${times.uatEndTime}` : '未找到'}</span></div>`;
        
        tooltip.innerHTML = content;
        tooltip.style.display = 'block'; // 先显示以获取尺寸
        
        // 获取提示框尺寸
        const rect = tooltip.getBoundingClientRect();
        
        // 默认放在按钮左侧
        let left = event.clientX - rect.width - 15;
        let top = event.clientY + 15;
        
        // 如果左侧空间不足，则显示在右侧
        if (left < 0) {
            left = event.clientX + 15;
        }
        
        // 确保不超出视窗底部
        if (top + rect.height > window.innerHeight) {
            top = event.clientY - rect.height - 15;
        }
        
        // 确保不超出视窗边界
        tooltip.style.left = Math.max(0, left) + 'px';
        tooltip.style.top = Math.max(0, top) + 'px';
    }

    // 在需求详情页面显示时间信息
    function displayTestTimesInDetailPage() {
        // 创建结果显示区域
        function createInfoBox() {
            const infoBox = document.createElement('div');
            infoBox.id = 'test-time-info-box';
            infoBox.style.cssText = `
                background-color: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                padding: 15px;
                margin: 20px 0;
                font-family: Arial, sans-serif;
            `;
            
            const title = document.createElement('h3');
            title.textContent = '测试时间信息';
            title.style.cssText = `
                margin-top: 0;
                color: #495057;
                border-bottom: 1px solid #dee2e6;
                padding-bottom: 10px;
            `;
            
            infoBox.appendChild(title);
            
            // 添加到页面顶部，在内容区域内
            const content = document.getElementById('content');
            if (content && content.firstChild) {
                content.insertBefore(infoBox, content.firstChild.nextSibling);
            }
            
            return infoBox;
        }
        
        const infoBox = createInfoBox();
        const times = extractTestTimesFromDOM(document);
        
        const timeInfoList = document.createElement('ul');
        timeInfoList.style.cssText = 'list-style: none; padding: 0;';
        
        // 添加提测时间
        const submitTimeItem = document.createElement('li');
        submitTimeItem.style.cssText = 'margin-bottom: 10px;';
        submitTimeItem.innerHTML = `<strong>提测时间：</strong>${times.submitTime || '未找到'}`;
        timeInfoList.appendChild(submitTimeItem);
        
        // 添加FAT测试时间
        const fatTimeItem = document.createElement('li');
        fatTimeItem.style.cssText = 'margin-bottom: 10px;';
        fatTimeItem.innerHTML = `<strong>FAT测试时间：</strong>${times.fatStartTime ? `${times.fatStartTime} 至 ${times.fatEndTime}` : '未找到'}`;
        timeInfoList.appendChild(fatTimeItem);
        
        // 添加UAT测试时间
        const uatTimeItem = document.createElement('li');
        uatTimeItem.innerHTML = `<strong>UAT测试时间：</strong>${times.uatStartTime ? `${times.uatStartTime} 至 ${times.uatEndTime}` : '未找到'}`;
        timeInfoList.appendChild(uatTimeItem);
        
        infoBox.appendChild(timeInfoList);
    }
})();
// ==UserScript==
// @name         GitLab-分支快捷创建
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  快捷创建基于日期的 GitLab 分支，默认展示最近10天的日期，可选支持选择周几，紧凑样式优化
// @author       章小慢
// @match        https://git.xxxxxxx.co/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 默认不选择星期几（-1表示未选择）
    let selectedWeekday = -1;
    const VERSION = 'v1'; // 默认版本号
    const BRANCH_PREFIX = 'release/'; // 分支前缀
    const NUM_OF_RECENT_DATES = 10; // 展示最近的日期数量
    const NUM_OF_WEEKDAY_DATES = 3; // 基于星期几生成的日期数量

    // 计算指定星期几的未来日期
    const getFutureDatesByWeekday = (weekday, count) => {
        const dates = [];
        const today = new Date();
        let currentDate = new Date(today);

        // 计算下一个指定的星期几
        const daysUntilNextWeekday = (weekday - today.getDay() + 7) % 7;
        currentDate.setDate(today.getDate() + daysUntilNextWeekday);

        // 生成指定数量的日期
        for (let i = 0; i < count; i++) {
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');

            dates.push(`${year}${month}${day}`);

            // 增加一周
            currentDate.setDate(currentDate.getDate() + 7);
        }

        return dates;
    };
    
    // 获取最近n天的日期
    const getRecentDates = (count) => {
        const dates = [];
        const today = new Date();
        
        for (let i = 0; i < count; i++) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() + i);
            
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            
            dates.push(`${year}${month}${day}`);
        }
        
        return dates;
    };

    // 格式化日期为显示格式
    const formatDateForDisplay = (dateString) => {
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

        const date = new Date(year, month - 1, day);
        const weekday = weekdays[date.getDay()];

        return `${year}-${month}-${day} ${weekday}`;
    };

    // 创建分支面板
    const createBranchPanel = () => {
        // 检查面板是否已存在
        if (document.getElementById('gitlab-branch-creator-panel')) {
            return;
        }

        // 创建面板元素
        const panel = document.createElement('div');
        panel.id = 'gitlab-branch-creator-panel';
        panel.style.cssText = `
            position: fixed;
            top: 140px;
            right: 20px;
            background: white;
            padding: 12px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
            z-index: 8888;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            width: 260px;
            max-height: 720px;
            overflow: hidden;
            display: none;
            transition: all 0.3s ease;
        `;

        // 面板标题
        const title = document.createElement('h4');
        title.textContent = 'GitLab 分支快捷创建';
        title.style.marginTop = '0';
        title.style.marginBottom = '12px';
        title.style.color = '#333';
        title.style.fontSize = '14px';
        title.style.fontWeight = '600';
        title.style.textAlign = 'center';

        // 创建星期选择容器，将标签和选择器放在一行并右对齐
        const weekdayContainer = document.createElement('div');
        weekdayContainer.style.display = 'flex';
        weekdayContainer.style.alignItems = 'center';
        weekdayContainer.style.justifyContent = 'flex-end';
        weekdayContainer.style.marginBottom = '10px';
        weekdayContainer.style.gap = '8px';
        
        const weekdayLabel = document.createElement('label');
        weekdayLabel.textContent = '选择星期几：';
        weekdayLabel.style.whiteSpace = 'nowrap';
        weekdayLabel.style.color = '#555';
        weekdayLabel.style.fontSize = '11px';
        
        const weekdaySelect = document.createElement('select');
        weekdaySelect.id = 'branch-weekday-select';
        weekdaySelect.style.width = '100px';
        weekdaySelect.style.padding = '6px 8px';
        weekdaySelect.style.border = '1px solid #ddd';
        weekdaySelect.style.borderRadius = '4px';
        weekdaySelect.style.fontSize = '11px';
        weekdaySelect.style.boxSizing = 'border-box';
        weekdaySelect.style.outline = 'none';
        weekdaySelect.style.transition = 'border-color 0.3s ease';
        
        weekdaySelect.addEventListener('focus', () => {
            weekdaySelect.style.borderColor = '#007bff';
        });
        
        weekdaySelect.addEventListener('blur', () => {
            weekdaySelect.style.borderColor = '#ddd';
        });

        // 添加星期选项
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        
        // 先添加默认的"不选择"选项
        const defaultOption = document.createElement('option');
        defaultOption.value = -1;
        defaultOption.textContent = '';
        defaultOption.selected = true;
        weekdaySelect.appendChild(defaultOption);
        
        // 然后添加星期几选项
        weekdays.forEach((day, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = day;
            weekdaySelect.appendChild(option);
        });

        // 添加到星期选择容器
        weekdayContainer.appendChild(weekdayLabel);
        weekdayContainer.appendChild(weekdaySelect);

        // 创建版本选择容器，将标签和选择器放在一行并右对齐
        const versionContainer = document.createElement('div');
        versionContainer.style.display = 'flex';
        versionContainer.style.alignItems = 'center';
        versionContainer.style.justifyContent = 'flex-end';
        versionContainer.style.marginBottom = '12px';
        versionContainer.style.gap = '8px';
        
        const versionLabel = document.createElement('label');
        versionLabel.textContent = '版本号：';
        versionLabel.style.whiteSpace = 'nowrap';
        versionLabel.style.color = '#555';
        versionLabel.style.fontSize = '11px';

        // 日期列表容器
        const datesContainer = document.createElement('div');
        datesContainer.id = 'dates-list-container';
        datesContainer.style.marginBottom = '12px';
        datesContainer.style.maxHeight = '0px';
        datesContainer.style.overflowY = 'auto';
        datesContainer.style.padding = '4px';
        datesContainer.style.borderRadius = '4px';
        datesContainer.style.backgroundColor = '#f9f9f9';

        // 将版本号输入框改为下拉菜单
        const versionSelect = document.createElement('select');
        versionSelect.id = 'branch-version-select';
        versionSelect.style.width = '100px'; // 与星期选择器宽度保持一致
        versionSelect.style.padding = '6px 8px';
        versionSelect.style.border = '1px solid #ddd';
        versionSelect.style.borderRadius = '4px';
        versionSelect.style.fontSize = '11px';
        versionSelect.style.boxSizing = 'border-box';
        versionSelect.style.outline = 'none';
        versionSelect.style.transition = 'border-color 0.3s ease';
        
        versionSelect.addEventListener('focus', () => {
            versionSelect.style.borderColor = '#007bff';
        });
        
        versionSelect.addEventListener('blur', () => {
            versionSelect.style.borderColor = '#ddd';
        });
        
        // 添加版本选项
        const versions = ['v1', 'v2', 'v3'];
        versions.forEach(version => {
            const option = document.createElement('option');
            option.value = version;
            option.textContent = version;
            if (version === VERSION) {
                option.selected = true;
            }
            versionSelect.appendChild(option);
        });
        
        // 添加到版本选择容器
        versionContainer.appendChild(versionLabel);
        versionContainer.appendChild(versionSelect);

        // 按钮容器
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.justifyContent = 'space-between';
        buttonsContainer.style.gap = '8px';
        buttonsContainer.style.marginTop = '12px';

        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.backgroundColor = '#6c757d';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.padding = '8px 12px';
        closeBtn.style.borderRadius = '4px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.flex = '1';
        closeBtn.style.fontSize = '11px';
        closeBtn.style.transition = 'background-color 0.2s ease';
        
        closeBtn.addEventListener('mouseover', () => {
            closeBtn.style.backgroundColor = '#5a6268';
        });
        
        closeBtn.addEventListener('mouseout', () => {
            closeBtn.style.backgroundColor = '#6c757d';
        });

        // 刷新按钮
        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = '刷新日期';
        refreshBtn.style.backgroundColor = '#007bff';
        refreshBtn.style.color = 'white';
        refreshBtn.style.border = 'none';
        refreshBtn.style.padding = '8px 12px';
        refreshBtn.style.borderRadius = '4px';
        refreshBtn.style.cursor = 'pointer';
        refreshBtn.style.flex = '1';
        refreshBtn.style.fontSize = '11px';
        refreshBtn.style.transition = 'background-color 0.2s ease';
        
        refreshBtn.addEventListener('mouseover', () => {
            refreshBtn.style.backgroundColor = '#0056b3';
        });
        
        refreshBtn.addEventListener('mouseout', () => {
            refreshBtn.style.backgroundColor = '#007bff';
        });

        // 切换面板显示的按钮
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'toggle-branch-creator-btn';
        toggleBtn.style.cssText = `
            position: fixed;
            top: 140px;
            right: 20px;
            background: #28a745;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 5px;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 11px;
            font-weight: 500;
            transition: all 0.2s ease;
        `;
        toggleBtn.textContent = '创建分支';
        toggleBtn.addEventListener('mouseover', () => {
            toggleBtn.style.backgroundColor = '#218838';
            toggleBtn.style.transform = 'translateY(-1px)';
            toggleBtn.style.boxShadow = '0 3px 6px rgba(0,0,0,0.25)';
        });
        
        toggleBtn.addEventListener('mouseout', () => {
            toggleBtn.style.backgroundColor = '#28a745';
            toggleBtn.style.transform = 'translateY(0)';
            toggleBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        });

        // 更新日期列表
        const updateDatesList = () => {
            datesContainer.innerHTML = '';

            const version = versionSelect.value.trim() || VERSION;
            let dates = [];
            
            // 根据是否选择了星期几来决定显示哪种日期列表
            if (selectedWeekday !== -1) {
                // 选择了星期几，显示基于星期几的日期
                dates = getFutureDatesByWeekday(selectedWeekday, NUM_OF_WEEKDAY_DATES);
            } else {
                // 未选择星期几，显示最近的日期
                dates = getRecentDates(NUM_OF_RECENT_DATES);
            }

            dates.forEach(date => {
                const dateItem = document.createElement('div');
                dateItem.style.marginBottom = '8px';
                dateItem.style.padding = '8px 10px';
                dateItem.style.backgroundColor = 'white';
                dateItem.style.borderRadius = '5px';
                dateItem.style.display = 'flex';
                dateItem.style.justifyContent = 'space-between';
                dateItem.style.alignItems = 'center';
                dateItem.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                dateItem.style.transition = 'box-shadow 0.2s ease';
                
                dateItem.addEventListener('mouseover', () => {
                    dateItem.style.boxShadow = '0 2px 4px rgba(0,0,0,0.12)';
                });
                
                dateItem.addEventListener('mouseout', () => {
                    dateItem.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                });

                const dateText = document.createElement('span');
                dateText.textContent = formatDateForDisplay(date);
                dateText.style.fontSize = '11px';
                dateText.style.color = '#333';
                dateText.style.flex = '1';
                dateText.style.marginRight = '8px';

                const createBtn = document.createElement('button');
                const branchName = `${BRANCH_PREFIX}${date}/${version}`;
                createBtn.textContent = '创建';
                createBtn.style.backgroundColor = '#17a2b8';
                createBtn.style.color = 'white';
                createBtn.style.border = 'none';
                createBtn.style.padding = '4px 8px';
                createBtn.style.borderRadius = '3px';
                createBtn.style.cursor = 'pointer';
                createBtn.style.fontSize = '11px';
                createBtn.style.transition = 'background-color 0.2s ease';
                createBtn.style.minWidth = '40px';
                createBtn.style.textAlign = 'center';
                
                createBtn.addEventListener('mouseover', () => {
                    createBtn.style.backgroundColor = '#138496';
                });
                
                createBtn.addEventListener('mouseout', () => {
                    createBtn.style.backgroundColor = '#17a2b8';
                });

                // 创建分支事件
                createBtn.addEventListener('click', () => {
                    createBranch(branchName);
                });

                dateItem.appendChild(dateText);
                dateItem.appendChild(createBtn);
                datesContainer.appendChild(dateItem);
            });
        };

        // 创建分支函数
        const createBranch = (branchName) => {
            // 获取当前项目的URL信息
            const currentUrl = window.location.href;
            
            // 使用更通用的正则表达式匹配当前URL
            const projectPathMatch = currentUrl.match(/^https:\/\/(.*?)\/(.*?)\/(.*?)\/(.*?)(\/|$)/);

            if (!projectPathMatch) {
                alert('无法识别当前GitLab项目路径，请确保在项目页面上操作。');
                return;
            }

            console.log(projectPathMatch);
            const domain = projectPathMatch[1]; // 获取当前域名
            const namespace = projectPathMatch[2];
            const group = projectPathMatch[3];
            const projectName =  projectPathMatch[4];

            // 构建创建分支的URL，使用当前域名
            const branchUrl = `https://${domain}/${namespace}/${group}/${projectName}/-/branches/new?branch_name=${encodeURIComponent(branchName)}`;

            // 在新标签页打开创建分支页面
            window.open(branchUrl, '_blank');
        };

        // 事件监听
        weekdaySelect.addEventListener('change', () => {
            selectedWeekday = parseInt(weekdaySelect.value);
            updateDatesList();
        });

        versionSelect.addEventListener('change', () => {
            updateDatesList();
        });

        refreshBtn.addEventListener('click', updateDatesList);

        // 关闭面板函数
        const closePanel = () => {
            panel.style.display = 'none';
            toggleBtn.style.display = 'block';
        };

        closeBtn.addEventListener('click', closePanel);

        toggleBtn.addEventListener('click', () => {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            toggleBtn.style.display = panel.style.display === 'none' ? 'block' : 'none';

            // 确保日期列表已更新
            if (panel.style.display === 'block') {
                updateDatesList();
            }
        });

        // 添加Esc键关闭面板功能
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && panel.style.display === 'block') {
                closePanel();
            }
        });

        // 组装面板
        panel.appendChild(title);
        panel.appendChild(weekdayContainer);
        panel.appendChild(versionContainer);
        panel.appendChild(datesContainer);

        // 添加按钮到按钮容器
        buttonsContainer.appendChild(closeBtn);
        buttonsContainer.appendChild(refreshBtn);
        panel.appendChild(buttonsContainer);

        // 添加到页面
        document.body.appendChild(panel);
        document.body.appendChild(toggleBtn);
    };

    // 页面加载完成后开始执行
    window.addEventListener('load', function() {
        createBranchPanel();
    });
})();
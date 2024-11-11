// ==UserScript==
// @name        迭代初始化 1.0
// @namespace   http://tampermonkey.net/
// @version     1.0
// @description An example to upload and read Excel file in Redmine.
// @author      小慢
// @match      https://t.xjjj.co/projects/cc_sprint/settings/agile_sprints
// @grant       GM_addStyle
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==

(function() {
    'use strict';

    const apiKey = 'c05d327406396c03c8ae43033d66229c886a9af4';

    const redmineUrl = 'https://t.xjjj.co/';

    // Define the form
    var form = document.createElement("form");

    // 优先级定义
    const priority = {"P0": 1,"P1": 2,"P2": 3,"P3": 4}
    // 需求文档地址前缀
    const issueLinkPrefix = "jojoread.yuque.com"

    // Define the button and its attributes
    var initBtn = document.createElement("input");
    initBtn.setAttribute("type", "button");
    initBtn.setAttribute("value", "迭代初始化");
    initBtn.style.marginLeft = '5px';

    // 查询迭代列表的 table 
    var buttons = document.querySelectorAll("td.buttons");
    

    for (var buttonItem of buttons) {
        buttonItem.insertBefore(initBtn, buttonItem.firstChild);
         // 在编辑按钮之后插入新按钮
        var editButton = buttonItem.querySelector('a.icon-edit');
        if (editButton) {
            buttonItem.insertBefore(initBtn, editButton.nextSibling);
        } else {
            // 如果没找到编辑按钮，就直接添加到td元素末尾
            buttonItem.appendChild(initBtn);            

        }
    }

   // 按钮点击事件处理函数
   initBtn.addEventListener('click', function() {
        // 创建输入文本框的弹出框及样式设置
        const inputBox = $('<div>').addClass('input-popup').html('<input type="text" id="inputText" placeholder="需求链接"><br><input type="text" id="customer_sprint_id" placeholder="迭代ID"><br><input type="text" id="customer_sprint_name" placeholder="迭代名称"><br><button id="confirmButton">确定</button><button id="cancelButton">取消</button>');
        const overlay = $('<div>').addClass('overlay').css({
            'position': 'fixed',
            'top': '0',
            'left': '0',
            'width': '100%',
            'height': '100%',
            'background-color': 'rgba(0, 0, 0, 0.5)',
            'z-index': '9998',
            'display': 'flex',
            'justify-content': 'center',
            'align-items': 'center'
        });
        overlay.append(inputBox);
        $('body').append(overlay);

        // 确定按钮点击事件处理函数
        $('#confirmButton').on('click', function() {
            const inputValue = $('#inputText').val();
            const sprintId = $('#customer_sprint_id').val();
            const sprintName = $('#customer_sprint_name').val();
            // 移除弹出框
            overlay.remove();
           var dataArr =   buildData(inputValue,sprintId,sprintName);
            for (let data of dataArr) {
                create(data,false)
            }

        });

        // 取消按钮点击事件处理函数
        $('#cancelButton').on('click', function() {
            // 移除弹出框
            overlay.remove();
        });
    });
    // 样式定义
   $('head').append('<style>.input-popup { background-color: white; padding: 20px; border-radius: 4px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.2); }.input-popup input { margin-bottom: 10px; width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; }.input-popup button { background-color: #4CAF50; color: white; border: none; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; border-radius: 4px; cursor: pointer; margin-right: 10px; }.input-popup button:last-child { margin-right: 0; }</style>');

    

    function buildData(link, sprintId, springName){
        return  [
            {
                "需求": {
                    "text": "【产品】"+springName+"-值班",
                    "link": link
                },
                "序号": "01",
                "优先级": "P0",
                "迭代": sprintId
            },
             {
                "需求": {
                    "text": "02 【产品】"+springName+"-杂项",
                    "link": link
                },
                                 "序号": "01",
                "优先级": "P0",
                "迭代": sprintId
            },
             {
                "需求": {
                    "text": "03 【产品】"+springName+"-SM日常",
                    "link": link
                },
                "优先级": "P0",
                 "迭代": sprintId
            },
       ]
    }


    function create(data,reTry){
        var issueSource = "业务需求";
        if (data["需求"]["text"].includes("【技术】")) {
            issueSource = "技术需求";
        }
       if (data["需求"]["text"].includes("【产品】")) {
            issueSource = "产品需求";
        }
        const newIssueData = {
            "issue": {
                // Replace with actual values
                "project_id": projectId, // 
                "tracker_id": 1, //
                "subject": data['序号']+data["需求"]["text"],
                "description": '',
                "status_id": 1,  // 1:新建 
                "priority_id": priority[data["优先级"]],
                // "start_date": '2023-12-17',
                "custom_field_values": {
                    "3": [], // 对应端 ["服务端","iOS","Android","H5","PC"]
                    "4": issueSource,
                    "5": data["需求"]["link"],
                    "6": '',
                    "7": ''
                },
                "agile_data_attributes": {
                    "story_points": 0,
                    "agile_sprint_id": data["迭代"]
                }
            }
        };
        console.log(newIssueData);
        fetch(`${redmineUrl}issues.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Redmine-API-Key': apiKey
            },
            body: JSON.stringify(newIssueData) // 将 JavaScript 对象转换为 JSON 字符串
        })
            .then(response => response.json())
            .then(result => {
            console.log(`创建需求成功：${newIssueData["issue"]["subject"]}，需求号为： ${result.issue.id}`);
            console.log(result)
        })
            .catch((error) => {
            if(reTry){
                console.log(`创建需求失败： ${newIssueData}，Error:${error}`);
                alert(`创建需求失败： ${newIssueData["issue"]["subject"]}`);
            }else{
                create(data,true)
            }
        });
    }

})();
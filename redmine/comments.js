// ==UserScript==
// @name         耗时快捷注释
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  jojo-cc-redmine fast fill comments
// @author       章小慢
// @match        https://t.xjjj.co/*time_entries*
// @match        https://t.xjjj.co/issues/*
// @icon         https://devops.xjjj.co/favicon.ico
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Your code here...
    console.info("快捷注释脚本加载...");
    // 定位耗时注释的文本框
    var commentsInputElement = document.getElementById("time_entry_comments")
    // 如果没有注释的文本框不启用快捷注释功能
    if (commentsInputElement == undefined) {
        console.log("不启用快捷注释");
        return;
    }

    // 分组注释数据块
    var commentsMap = new Map();
    // 快捷注释下拉默认值
    var defaultOptionData = [];
    // 活动类型
    var activeType = "";

    var activeStoryArray = [11,15,16,20];

    var activeTestArray = [11,14,17];

    var activeDevelopArray = [9,18,19];

    var activeBugArray = [11,15]
    

    // 注释下拉对象
    var commentselect;

    // 活动下拉对象
    var activitySelect;

    var commentPElement;

    // 初始化注释的下拉框数据, 定位commentselect, activitySelect
    function initData () {
        commentselect = document.createElement('select');
        commentPElement = document.createElement('p');
        activitySelect = document.getElementById("time_entry_activity_id")
        defaultOptionData = [
            "熟悉需求",
            "熟悉需求:下个迭代",
            "需求评审",
            "技术方案设计",
            "技术方案评审",
            "测试用例编写",
            "测试用例评审",        
            "开发",
            "SONAR",
            "自测",
            "联调",
            "冒烟",
            "单测",
            "FAT测试",
            "UAT测试",
            "自动化",
            "JACOCO",
            "性能",
            "回归用例",
            "问题排查",
            "修复BUG",
            "文档沉淀",
            "值班:线上",
            "值班:线下",
            "上线准备",
            "上线验证",
            "会议" ,
            "会议: 测试周会",
            "会议: 小组交流" ,
            "会议: 后端周会",
            "会议: 前端周会",
            "会议: 迭代回顾",
            
        ];

        // 熟悉需求
        commentsMap.set(16, [
            "熟悉需求",
            "熟悉需求:下个迭代"
        ]);
        // 需求评审
        commentsMap.set(20, [
            "需求评审",
            "项目制需求评审: ",
        ]);
        // 测试用例编写
        commentsMap.set(14, [
            "测试用例编写",
        ]);
        // 测试用例评审
        commentsMap.set(17, [
            "测试用例评审",
        ]);

        // 技术方案设计
        commentsMap.set(18, [
            "技术方案设计",
        ]);

        // 技术方案评审
        commentsMap.set(19, [
            "技术方案评审",
        ]);

        // 技术方案设计
        commentsMap.set(8, [
            "技术方案设计",
        ]);
        // 开发
        commentsMap.set(9, [
            "开发",
            "SONAR",
            "自测",
            "联调",
            "冒烟",
            "单测",
        ]);
        // 测试
        commentsMap.set(11, [
            "FAT测试",
            "UAT测试",
            "自动化",
            "JACOCO",
            "性能测试",
            "回归用例",
            "值班:线上",
            "值班:线下",
            "上线准备",
            "上线验证",        
            "会议: 测试周会" ,
            "会议: 小组交流" ,
        ]);

        // 研发跟测
        commentsMap.set(15, [
            "问题排查",
            "修复BUG",
            "文档沉淀",
            "值班:线上",
            "值班:线下",
            "上线准备",
            "上线验证",
            "会议: 后端周会",
            "会议: 前端周会",
            "会议: 迭代回顾",
            "会议: 小组交流" 
        ]);
    }

    // 页面加载
    function pageLoad() {        
        // 将快捷注释下拉的值填充到原来的 input 框内
        commentselect.addEventListener("change", function() {
            var selectedValue = commentselect.value;
            commentsInputElement.value = selectedValue;
        });
        commentPElement.appendChild(commentselect);

        var divEle = commentsInputElement.parentNode.parentNode;
        // 文本注释框所属的 P 标签
        var textCommentParentP = commentsInputElement.parentNode;

        // 活动下拉框所属的 P 标签
        var activityParentP = activitySelect.parentNode;

        divEle.insertBefore(activityParentP,textCommentParentP.previousSibling)

        // 插入到原来的注释的后面
        divEle.insertBefore(commentPElement,textCommentParentP.previousSibling)
    }

    // 根据任务类型过滤活动可选的值
    function filterActiveSelectOption() {

        // 判断任务类型是什么类型? 
        var issueText ;
        if (document.getElementById("time_entry_issue")) {
            issueText = document.getElementById("time_entry_issue").innerText;
        } else {
            var issueTrackerEle = document.getElementById("issue_tracker_id")
            if (issueTrackerEle && issueTrackerEle.selectedOptions[0]) {
                issueText = issueTrackerEle.selectedOptions[0].innerText+" ";
            }
        }
        
        if (issueText.includes("测试任务 ")) {
            activeType = "test";
        }
        if (issueText.includes("开发任务 ")) {
            activeType = "develop";
        }
        if (issueText.includes("需求 ")) {
            activeType = "story";
        }

        if (issueText.includes("Bug ")) {
            activeType = "bug";
        }        
        var filterArray = [];
        switch (activeType) {
            case "test": 
                filterArray = activeTestArray;
                break;
            case "develop": 
                filterArray = activeDevelopArray;
                break;
            case "story":
                filterArray = activeStoryArray;
                break;
            case "bug":
                filterArray = activeBugArray;
                break;
            default:
                filterArray = activeStoryArray;
                break;
        }

        // 获取所有 option 元素
        let options = activitySelect.options;
         // 遍历所有 option 元素
        for (let i = 0; i < options.length; i++) {
            if (!filterArray.includes(parseInt(options[i].value))) {
                options[i].disabled = true;
            }
        }

         // 倒序遍历并移除 option 元素
        for (let i = options.length - 1; i >= 0; i--) {
            if (options[i].value != "" && !filterArray.includes(parseInt(options[i].value))) {
                console.log(options[i].value);
                console.log(options[i].innerText+"被移除");
                activitySelect.removeChild(options[i]);
            }
        }   
         // 模拟触发事件
        triigerChange(activitySelect);
            
    }

    function triigerChange(selectObj){
        var changeEvent = new Event("change");
        selectObj.dispatchEvent(changeEvent)
    }
    // 处理快捷注释下拉框
    function renderCommentSelese() {    
        // 定义一个 p 标签, 并且设置 label
        commentPElement.innerHTML = '<label for="time_entry_comments">快捷注释<span class="required"> *</span></label>';
        
        // 定位活动的下拉选择
        var activitySelect = document.getElementById("time_entry_activity_id")


        // 将快捷注释下拉的值填充到原来的 input 框内
        activitySelect.addEventListener("change", function() {
            var selectedValue = parseInt(activitySelect.value);
            buidlCommentOptions(selectedValue)
        });

        // 模拟触发事件
        triigerChange(activitySelect);
       
        // 设置下拉的值. 页面回显使用
        commentselect.value = commentsInputElement.value;
    }

    // 构建快捷注释下拉的选项
    function buidlCommentOptions(activityValue) {
        var optionData = commentsMap.get(activityValue)
        if (optionData == undefined || optionData.length == 0) {
            optionData = defaultOptionData;
        }
        
        commentselect.innerHTML = "";
        for (var i = 0; i < optionData.length; i++) {
            var option = document.createElement("option");
            option.value = optionData[i];
            option.text = optionData[i];
            commentselect.add(option);
        }

        // 模拟触发事件
        triigerChange(commentselect);
    }


    // 初始化数据
    initData();
    // 
    renderCommentSelese();
    // 处理注释下拉的事件注册, 以及在页面的位置
    pageLoad();

    // 根据任务类型过滤活动可选的范围
    filterActiveSelectOption();
    

    
})();
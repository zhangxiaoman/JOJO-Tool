// ==UserScript==
// @name         耗时快捷注释
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  jojo-cc-redmine fast fill comments
// @author       章小慢
// @match        https://t.xjjj.co/*time_entries*
// @match        https://t.xjjj.co/issues/*
// @icon         https://devops.xjjj.co/favicon.ico
// @grant        none
// @downloadURL https://update.greasyfork.org/scripts/478246/%E8%80%97%E6%97%B6%E5%BF%AB%E6%8D%B7%E6%B3%A8%E9%87%8A.user.js
// @updateURL https://update.greasyfork.org/scripts/478246/%E8%80%97%E6%97%B6%E5%BF%AB%E6%8D%B7%E6%B3%A8%E9%87%8A.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // Your code here...
    console.info("快捷注释脚本加载...");
    // 定位耗时注释的文本框
    var commentsInputElement = document.getElementById("time_entry_comments")

    var commentsInputElementFree;
    var commentsInputElementText = commentsInputElement.value;
    var commentsInputElementTextPrefix = commentsInputElementText.split("|")[0];
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

    // 需求类型 可选的活动范围
    var activeStoryArray = [11,15,16,20];

    // 测试任务类型 可选的活动范围
    var activeTestArray = [11,14,17];

    // 开发任务类型 可选的活动范围
    var activeDevelopArray = [9,18,19];

    // BUG类型 可选的活动范围
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
            "需求讨论",
            "技术方案设计",
            "技术方案评审",
            "技术方案熟悉",
            "测试用例编写",
            "测试用例评审",        
            "开发",
            "SONAR",
            "自测",
            "联调",
            "冒烟",
            "单测",
            "FAT测试",
            "FAT测试:功能测试",
            "FAT测试:数据准备",
            "UAT测试",
            "自动化",
            "JACOCO",
            "性能测试",
            "性能测试:数据准备",
            "回归用例",
            "问题排查",
            "修复BUG",
            "文档沉淀",
            "值班:线上",
            "值班:线下",
            "上线准备",
            "上线验证",
            "会议: 其他",
            "会议: 测试周会",
            "会议: 小组交流",
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
            "FAT测试:功能测试",
            "FAT测试:数据准备",
            "UAT测试",
            "自动化",
            "JACOCO",
            "性能测试",
            "性能测试:数据准备",
            "回归用例",
            "文档沉淀",
            "值班:线上",
            "值班:线下",
            "上线准备",
            "上线验证",
            "会议: 其他",
            "会议: 测试周会",
            "会议: 迭代回顾",
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
            "会议: 其他",
            "会议: 小组交流",
            "会议: 后端周会",
            "会议: 迭代回顾",
        ]);
    }

    // 页面加载
    function pageLoad() {        
        // 将快捷注释下拉的值填充到原来的 input 框内
        commentselect.addEventListener("change", function() {
            if (commentselect.value.length > 0) {
                commentsInputElement.value = commentselect.value+ "|" + commentsInputElementFree.value;
            }
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



        // 复制一个文本框出来.
        var textCommentParentPNew = textCommentParentP.cloneNode(true);

        // 原来的注释设置为不可编辑
        commentsInputElement.setAttribute('readonly', 'readonly');

        // 插入到原来的注释的后面
        textCommentParentP.insertAdjacentElement('afterend', textCommentParentPNew);

        // 用来随意输入注释
        commentsInputElementFree = textCommentParentPNew.querySelector('input');
        textCommentParentPNew.querySelector('label').innerText="自由注释";
        commentsInputElementFree.setAttribute("id","time_entry_comments_free")
        commentsInputElementFree.setAttribute("name","")

        // 分割 原注释中的内容
        var textArray = commentsInputElementText.split("|");
        // 移除第一个元素
        textArray.shift();
        // 自由输入的 input 框内填充后面的内容
        commentsInputElementFree.value = textArray.join('');

        // 添加失去焦点事件监听器
        commentsInputElementFree.addEventListener('blur', function() {
            if (commentselect.value.length > 0) {
                // 失去焦点时触发的操作
                commentsInputElement.value = commentselect.value+ "|" + commentsInputElementFree.value;
            }

        });

        // 添加失去焦点事件监听器
        commentsInputElementFree.addEventListener('input', function() {
            if (commentselect.value.length > 0) {
                // 失去焦点时触发的操作
                commentsInputElement.value = commentselect.value+ "|" + commentsInputElementFree.value;
            }


        });



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
        // 倒序遍历并移除 option 元素, Fix在移除的过程中, option 的索引变化.不能遍历所有的值
        for (let i = options.length - 1; i >= 0; i--) {
            if (options[i].value != "" && !filterArray.includes(parseInt(options[i].value))) {
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
       
    }

    // 构建快捷注释下拉的选项
    function buidlCommentOptions(activityValue) {
        // 活动选择的是 "请选择" 清空活动注释的下拉
        if (isNaN(activityValue)) {
            commentselect.innerHTML = "";
            commentsInputElement.value = "";
            if (commentsInputElementFree) {
                commentsInputElementFree.value = "";
            }

            return;
        }
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
    // 加载注释的下拉框
    renderCommentSelese();
    // 处理注释下拉的事件注册, 以及在页面的位置
    pageLoad();
    // 根据任务类型过滤活动可选的范围
    filterActiveSelectOption();

    // 设置下拉的值. 页面回显使用
    commentselect.value = commentsInputElementTextPrefix;
    // 模拟触发事件
    triigerChange(commentselect);


})();
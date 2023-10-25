// ==UserScript==
// @name         耗时快捷注释
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://t.xjjj.co/*time_entries*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=xjjj.co
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Your code here...
    console.error("快捷注释脚本加载");

    // 定位耗时注释的文本框
    var inputElement = document.getElementById("time_entry_comments")
    if (inputElement == undefined) {
        console.log("不启用快捷注释");
        return;
    }
    var inputValue = inputElement.value;

    // 插入快捷注释的下拉框
    var pElement = document.createElement('p');

    // 定义一个 p 标签, 并且设置 label
    pElement.innerHTML = '<label for="time_entry_comments">快捷注释<span class="required"> *</span></label>';

    var selectElement = document.createElement('select');
    var optionsData = [
        "熟悉需求",
        "问题梳理",
        "技术方案设计",
        "技术方案评审",
        "用例编写",
        "测试用例评审",
        "研发跟测",
        "测试",
        "开发",
        "SONAR", 
        "联调",
        "冒烟",
        "周会", 
        "月会"
        ];

    for (var i = 0; i < optionsData.length; i++) {
        var option = document.createElement("option");
        option.value = optionsData[i];
        option.text = optionsData[i];
        selectElement.add(option);
    }


    // 设置下拉的值. 页面回显使用
    selectElement.value = inputValue;

    // 将快捷注释下拉的值填充到原来的 input 框内
    selectElement.addEventListener("change", function() {
        var selectedValue = selectElement.value;
        inputElement.value = selectedValue;
    });

    pElement.appendChild(selectElement);

    var divEle = inputElement.parentNode.parentNode;
    var inputParent = inputElement.parentNode;
    // 插入到原来的注释的后面
    divEle.insertBefore(pElement,inputParent.nextSibling)
})();
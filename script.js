// --------------------------
// 全局变量
// --------------------------

// 当前所选分配方式
let currentMethod = null; // 'f' 代表固定分配， 'v' 代表可变分配

// 固定分配方式的信息
let fixInfo = {
    sysMem : 1024, // 内存空间大小
    memOccupy: 0.00,
    idleTableIndex: 1,
    jobsTableIndex: 1,
    idleTable : [
        // {
        //     id: 1,       // 分区号
        //     size: 1024,  // 分区大小
        //     start: 0,    // 分区起始地址
        //     status: 0,   // 状态 0：空闲， 1：不空闲
        // }
    ], // 空闲分区表
    jobsTable : [
        // {
        //     id: 1,      // 作业号
        //     size: 100,  // 所需内存
        //     start: 20   // 装入后内存的起始地址
        // }
    ], // 作业信息表
}

// 可变分配的信息
let varInfo = {
    sysMem : 1024, // 内存空间大小
    memOccupy: 0.00,
    idleTableIndex: 2,
    jobsTableIndex: 1,
    isNF: false,
    isRePos: false,
    nfPointer: 0, // nf算法指针
    idleTable : [
        // {
        //     id: 1,       // 分区号
        //     size: 1024,  // 分区大小
        //     start: 0,    // 分区起始地址
        //     status: 0,   // 状态 0：空闲， 1：不空闲
        // }
    ], // 空闲分区表
    jobsTable : [
        // {
        //     id: 1,      // 作业号
        //     size: 100,  // 所需内存
        //     start: 20   // 装入后内存的起始地址
        // }
    ], // 作业信息表
}


// ----------------------------
// 定义函数
// ----------------------------


// 页面初始化
function init(){
    // 禁用输入内存
    // document.querySelector('#input-memory').disabled = true;
    document.querySelector('#input-memory').classList.add('disabled-input');
    // My Choice
    document.querySelector('#my-choice').innerHTML = '未选择';
    // 阻止表单的提交事件 全局禁用回车
    document.onkeydown = function(e) {
        if(e.keyCode == 13) {
            return false;
        }
    }
    // 对输入框的禁用提示
    document.querySelector('#input-memory').addEventListener('click',(e)=>{
        if(e.target.className == 'disabled-input')
            alert('请选择完分配方式后再设定内存空间大小！');
    })
    document.querySelector('#input-memory').readOnly = true;
}

function goBuddySys(){
    location.href = 'buddySystem.html';
}

// 复制数组
function copyArr(originArr){
    let targetArr = [];
    for(let i=0; i< originArr.length; i++){
        targetArr.push(originArr[i])
    }
    return targetArr;
}

// 重新渲染空闲分区表 可变分区
function renderIdleTable(kind){
    let idleTableElement = null;
    let info = null;
    if(kind=='v'){
        idleTableElement = document.querySelector('#idle-partition-table-v tbody');
        info = varInfo;
    }else if(kind=='f'){
        idleTableElement = document.querySelector('#idle-partition-table-f tbody');
        info = fixInfo;
    }
    idleTableElement.innerHTML = '';
    for(let i = 0; i < info.idleTable.length; i++){
        let newNode = document.createElement('tr');
        newNode.innerHTML = `
            <td>${info.idleTable[i].id}</td>
            <td>${info.idleTable[i].size}</td>
            <td>${info.idleTable[i].start}</td>
            `;
        if(kind=='v')
            newNode.innerHTML += '<td>空闲</td>';
        else if(kind == 'f' && info.idleTable[i].status == 0)
            newNode.innerHTML += '<td style="color: orange;">未分配</td>';
        else if(kind == 'f' && info.idleTable[i].status == 1)
            newNode.innerHTML += '<td style="color: green;">已分配</td>';
        idleTableElement.appendChild(newNode);
    }
    displayAllocation(kind);
}

// 重新渲染作业信息表 可变分区
function renderJobsTable(kind){
    let jobsTableElement = null;
    let info = null;
    if(kind=='v'){
        jobsTableElement = document.querySelector('#jobs-table-title-v tbody');
        info = varInfo;
    }else if(kind=='f'){
        jobsTableElement = document.querySelector('#jobs-table-title-f tbody');
        info = fixInfo;
    }
    // 插入到表格中
    jobsTableElement.innerHTML = '';
    for(let i = 0; i < info.jobsTable.length; i++){
        let newNode = document.createElement('tr');
        newNode.innerHTML = `
            <td>${info.jobsTable[i].id}</td>
            <td>${info.jobsTable[i].size}</td>
            <td>${info.jobsTable[i].start}</td>
            <td><a herf='javascript:' onclick='endTheJob_${kind}(${i})' data-id='${i}'>终止</a></td>
            `;
        jobsTableElement.appendChild(newNode);
    }
    displayAllocation(kind);
}

// 终止作业 回收内存空间  固定分区
function endTheJob_f(index){
    const thisJob = fixInfo.jobsTable[index];
    fixInfo.jobsTable.splice(index,1);

    for(let i=0;i<fixInfo.idleTable.length;i++){
        if(thisJob.start == fixInfo.idleTable[i].start && fixInfo.idleTable[i].status == 1){
            fixInfo.idleTable[i].status = 0;
        }
    }
    alert('回收内存成功！');
    renderJobsTable('f');
    renderIdleTable('f');
}

// 终止作业 回收内存空间  可变分区
function endTheJob_v(index){
    const thisJob = varInfo.jobsTable[index];
    varInfo.jobsTable.splice(index,1);

    let upAndDown = false;
    let isNeighbor = false;
    // 与其他空闲分区相邻
    for(let i=0;i<varInfo.idleTable.length;i++){
        if(isNeighbor)
            break;
        // 上相邻
        if(varInfo.idleTable[i].start + varInfo.idleTable[i].size == thisJob.start){
            isNeighbor = true;
            for(let j=0; j<varInfo.idleTable.length;j++){
                if(j==i)
                    continue;
                // 上下同时相邻 通过下相邻触发
                if(varInfo.idleTable[j].start == thisJob.start + thisJob.size){
                    upAndDown = true;
                    varInfo.idleTable[i].size = varInfo.idleTable[i].size + thisJob.size + varInfo.idleTable[j].size;
                    varInfo.idleTable.splice(j,1);
                    break;
                }
            }
            // 仅上相邻
            if(!upAndDown){
                varInfo.idleTable[i].size += thisJob.size; 
            }
            break;
        }
        // 下相邻
        else if(!isNeighbor && varInfo.idleTable[i].start == thisJob.start + thisJob.size){
            isNeighbor = true;
            for(let j=0; j<varInfo.idleTable.length;j++){
                if(j==i)
                    continue;
                // 上下同时相邻 通过上相邻触发
                if(varInfo.idleTable[j].start + varInfo.idleTable[j].size == thisJob.start){
                    upAndDown = true;
                    varInfo.idleTable[j].size = varInfo.idleTable[j].size + thisJob.size + varInfo.idleTable[i].size;
                    varInfo.idleTable.splice(i,1);
                    break;
                }
            }
            // 仅下相邻
            if(!upAndDown){
                varInfo.idleTable[i].start = thisJob.start;
                varInfo.idleTable[i].size += thisJob.size;
            }
            break;
        }
    }
    // 不相邻
    if(!isNeighbor){
        varInfo.idleTable.push({
            id: varInfo.idleTableIndex++,
            size: thisJob.size,
            start: thisJob.start,
            status: 0
        })
    }

    alert('回收内存成功！')
    renderJobsTable('v');
    renderIdleTable('v');
}


// 更改内存空间大小 固定分区
function reviseMem_f(num){
    document.querySelector('#display-end-index-f').innerHTML = num;
    document.querySelector('#sysInfo-mem-f').innerHTML = num + " KB";
    document.querySelector('#sysInfo-occupy-f').innerHTML = 0 + "%";

    // fixInfo.idleTable = [];
    // 分区不等分
    if(fixInfo.idleTable.length == 0){
        fixInfo.idleTable = [];
        let totalMem = num;
        let startIndex = 0;
        for(let i=1;totalMem>0;i*=2){
            if(totalMem>=i){
                fixInfo.idleTable.push({
                    id: fixInfo.idleTableIndex++,
                    size: i,
                    start: startIndex,
                    status: 0
                });
                startIndex += i;
                totalMem -= i;
            }else{
                fixInfo.idleTable.push({
                    id: fixInfo.idleTableIndex++,
                    size: totalMem,
                    start: startIndex,
                    status: 0
                });
                totalMem = 0;
                break;
            }
        }

        fixInfo.jobsTable = [];
        fixInfo.jobsTableIndex = 1;
    }
    renderIdleTable('f');
}

// 更改内存空间大小 可变分区
function reviseMem_v(num){
    document.querySelector('#display-end-index-v').innerHTML = num;
    document.querySelector('#sysInfo-mem-v').innerHTML = num + " KB";
    document.querySelector('#sysInfo-occupy-v').innerHTML = 0 + "%";

    // varInfo.idleTable = [];
    if(varInfo.idleTable.length == 0){
        varInfo.idleTable = [];
        varInfo.idleTable.push({
            id: 1,
            size: num,
            start: 0,
            status: 0
        })

        varInfo.jobsTable = [];
        varInfo.idleTableIndex = 2;
        varInfo.jobsTableIndex = 1;
        varInfo.nfPointer = 0;
        varInfo.isNF = false;
    } 
    renderIdleTable('v');
}

// 插入新的作业 可变分区
function insertJob(kind,size,start){
    let info = null;
    if(kind=='v'){
        info = varInfo;
    }else if(kind=='f'){
        info = fixInfo;
    }
    info.jobsTable.push({
        id: info.jobsTableIndex++,
        size: size,
        start: start
    });
    renderJobsTable(kind);
}

// 修改空闲分区
function reviseIdleTable(id, occupiedSize){
    let thisIdle = null;
    let index = -1;
    for(let i=0;i<varInfo.idleTable.length;i++){
        if(varInfo.idleTable[i].id == id){
            thisIdle = varInfo.idleTable[i];
            index = i;
            break;
        }
    }
    varInfo.idleTable.splice(index,1);
    if(occupiedSize < thisIdle.size){
        varInfo.idleTable.push({
            id: varInfo.idleTableIndex++,
            size: thisIdle.size - occupiedSize,
            start: thisIdle.start + occupiedSize,
            status: 0
        })
    }
   renderIdleTable('v');
}

// 紧凑
function compact(){
    let sumOfJobsSize = 0;
    varInfo.jobsTable.sort((object1,object2)=>{
        return object1.start - object2.start; // 升序
    })
    // 移动作业
    if(varInfo.jobsTable[0].start!=0){
        varInfo.jobsTable[0].start = 0;
    }
    for(let i=1;i<varInfo.jobsTable.length;i++){
        if(varInfo.jobsTable[i].start != varInfo.jobsTable[i-1].start + varInfo.jobsTable[i-1].size){
            varInfo.jobsTable[i].start = varInfo.jobsTable[i-1].start + varInfo.jobsTable[i-1].size;
        }
    }
    // 合并空闲分区
    for(let i=0;i<varInfo.jobsTable.length;i++){
        sumOfJobsSize += varInfo.jobsTable[i].size;
    }
    varInfo.idleTable = [];
    varInfo.idleTable.push({
        id: varInfo.idleTableIndex++,
        start: sumOfJobsSize,
        size: varInfo.sysMem - sumOfJobsSize,
        status: 0
    })
    renderIdleTable('v');
    renderJobsTable('v');
}

// 首次适应
function FF(newJobSize){
    let tempArr = copyArr(varInfo.idleTable);
    // 根据起始地址排序
    tempArr.sort((object1,object2)=>{
        return object1.start - object2.start; // 升序
    })
    console.log('FF arr: ', tempArr);
    for(let i=0;i<tempArr.length;i++){
        if(tempArr[i].size>=newJobSize){
            insertJob('v',newJobSize,tempArr[i].start); // 插入作业
            reviseIdleTable(tempArr[i].id, newJobSize);
            if(varInfo.isRePos)
                compact();
            alert('成功为该作业分配内存空间');
            return;
        }
    }
    if(varInfo.isRePos){
        compact();
        if(newJobSize<=varInfo.idleTable[0].size){
            insertJob('v',newJobSize,varInfo.idleTable[0].start); // 插入作业
            varInfo.idleTable[0].size -= newJobSize;
            alert('成功为该作业分配内存空间 （紧凑后）');
            return;
        }
    }
        alert('无法为该作业分配内存空间！');
}

// 循环首次适应  
function NF(newJobSize){
    let tempArr = copyArr(varInfo.idleTable);
    // 根据起始地址排序
    tempArr.sort((object1,object2)=>{
        return object1.start - object2.start; // 升序
    })
    console.log('NF arr: ', tempArr);
    console.log('pointer: ',varInfo.nfPointer);
    for(let i=varInfo.nfPointer%tempArr.length, j = 0;j<tempArr.length;i++,j++){
        if(tempArr[i].size>=newJobSize){
            varInfo.nfPointer = i+1;
            insertJob('v',newJobSize,tempArr[i].start); // 插入作业
            reviseIdleTable(tempArr[i].id, newJobSize);
            if(varInfo.isRePos)
                compact();
            alert('成功为该作业分配内存空间');
            return;
        }
    }
    if(varInfo.isRePos){
        compact();
        if(newJobSize<=varInfo.idleTable[0].size){
            insertJob('v',newJobSize,varInfo.idleTable[0].start); // 插入作业
            varInfo.idleTable[0].size -= newJobSize;
            alert('成功为该作业分配内存空间 （紧凑后）');
            return;
        }
    }

    alert('无法为该作业分配内存空间！');
}

// 最佳适应
function BF(newJobSize){
    let tempArr = copyArr(varInfo.idleTable);
    // 根据内存大小排序
    tempArr.sort((object1, object2)=>{
        return object1.size - object2.size; // 升序
    })
    console.log('BF arr: ', tempArr);
    for(let i=0;i<tempArr.length;i++){
        if(tempArr[i].size>=newJobSize){
            insertJob('v',newJobSize,tempArr[i].start); // 插入作业
            reviseIdleTable(tempArr[i].id, newJobSize);
            if(varInfo.isRePos)
                compact();
            alert('成功为该作业分配内存空间');
            return;
        }
    }
    if(varInfo.isRePos){
        compact();
        if(newJobSize<=varInfo.idleTable[0].size){
            insertJob('v',newJobSize,varInfo.idleTable[0].start); // 插入作业
            varInfo.idleTable[0].size -= newJobSize;
            alert('成功为该作业分配内存空间 （紧凑后）');
            return;
        }
    }
    alert('无法为该作业分配内存空间！');
}

// 最坏适应
function WF(newJobSize){
    let tempArr = copyArr(varInfo.idleTable);
    // 根据内存大小排序
    tempArr.sort((object1, object2)=>{
        return object2.size - object1.size; // 降序
    })
    console.log('BF arr: ', tempArr);
    for(let i=0;i<tempArr.length;i++){
        if(tempArr[i].size>=newJobSize){
            insertJob('v',newJobSize,tempArr[i].start); // 插入作业
            reviseIdleTable(tempArr[i].id, newJobSize);
            if(varInfo.isRePos)
                compact();
            alert('成功为该作业分配内存空间');
            return;
        }
    }
    if(varInfo.isRePos){
        compact();
        if(newJobSize<=varInfo.idleTable[0].size){
            insertJob('v',newJobSize,varInfo.idleTable[0].start); // 插入作业
            varInfo.idleTable[0].size -= newJobSize;
            alert('成功为该作业分配内存空间 （紧凑后）');
            return;
        }
    }
    alert('无法为该作业分配内存空间！');
}

// ----------------------------
// 按钮绑定事件
// ----------------------------

// 事件绑定
// 循环首次适应的设定
function alg_v_nf_event(){
    // if(varInfo.jobsTable.length == 0){
    //     if(confirm('你选择的是循环首次适应算法，若选择该算法，则必须使用到内存空间不被任何作业占用为止，期间不能使用其他分配算法！')){
    //         varInfo.isNF = true;
    //         this.checked = true;
    //     }else{
    //         document.querySelector('#alg_v_nf').checked = false;
    //         document.querySelectorAll(".alg_v_a")[0].checked = true;
    //     }
    // }else{
    //     alert("当内存空间不被任何作业占用时方可使用该算法！");
    //     document.querySelector('#alg_v_nf').checked = false;
    //     document.querySelectorAll(".alg_v_a")[0].checked = true;
    // }
}

// 其他方式的设定
function alg_v_a_event(){
    // if(varInfo.isNF && varInfo.jobsTable.length>0){
    //     alert("在使用循环首次适应算法时，不可使用其他算法，直到内存空间不被任何作业占用为止！");
    //     let list = document.querySelectorAll(".alg_v_a");
    //     for(let i=0;i<list.length;i++){
    //         list.checked = false;
    //     }
    //     document.querySelector('#alg_v_nf').checked = true;
    // }else if(varInfo.isNF && varInfo.jobsTable.length==0){
    //     varInfo.isNF = false;
    // }
}


// 提交设置 （提交内存空间大小）
function submmit_setting(){     
    const value =  parseInt(document.querySelector('#input-memory').value);
    console.log('new mem:' + value);
    if(currentMethod == 'f' && value >= 1){
        if(fixInfo.jobsTable.length == 0){
            fixInfo.sysMem = value;
            fixInfo.idleTable = []
            reviseMem_f(fixInfo.sysMem);

            alert(`固定式分配方式： 设定内存空间为${fixInfo.sysMem}KB`)
        }else{
            alert('固定式分配方式：需要保证内存不被任何作业占用后方可设定内存空间大小！');
        }
    } else if(currentMethod == 'v' && value >= 1){
        if(varInfo.jobsTable.length == 0){
            varInfo.sysMem = value;
            varInfo.idleTable = []
            reviseMem_v(varInfo.sysMem);

            alert(`可变式分配方式： 设定内存空间为${varInfo.sysMem}KB`)
        }else{
            alert('可变式分配方式：需要保证内存不被任何作业占用后方可设定内存空间大小！');
        }
    } else if(currentMethod != 'f' && currentMethod != 'v' )
        alert("请先选择分配方式！");
    else if(value < 1)
        alert("输入的内存空间大小不应小于1KB！");
    else
        alert('输入不得为空，不得输入非数字字符！')
}


// 选择固定分配
function check_fixed_allocate(){
    currentMethod = 'f';

    document.querySelector('#default-content').style.display = 'none';
    document.querySelector('#fixed-allocate').style.display = 'block';
    document.querySelector('#variable-allocate').style.display = 'none';

    // document.querySelector('#input-memory').disabled = false;
    document.querySelector('#input-memory').classList.remove('disabled-input');
    document.querySelector('#input-memory').readOnly = false;
    document.querySelector('#my-choice').innerHTML = '固定式分区分配';

    reviseMem_f(fixInfo.sysMem);

    alert(`你已选择固定式分区方式， 内存空间为 ${fixInfo.sysMem} KB`);
}


// 选择可变分配
// -----------------------------
function check_variable_allocate(){
    currentMethod = 'v';

    document.querySelector('#default-content').style.display = 'none';
    document.querySelector('#fixed-allocate').style.display = 'none';
    document.querySelector('#variable-allocate').style.display = 'block';

    // document.querySelector('#input-memory').disabled =false;
    document.querySelector('#input-memory').classList.remove('disabled-input');
    document.querySelector('#input-memory').readOnly = false;
    document.querySelector('#my-choice').innerHTML = '可变式分区分配';

    reviseMem_v(varInfo.sysMem);

    alert(`你已选择可变式分区方式， 内存空间为 ${varInfo.sysMem} KB`);
}

// 新建进程 可变分配
function newJob_v(){
    const needSize = parseInt(document.querySelector('#job-need-memory-v').value); 
    const alg = document.querySelector('input[name="alg_v"]:checked').value;

    if(needSize >= 1){
        let str = `可变式分区方式: 新建作业，需占内存空间${needSize}KB, 选择`;
        switch(alg){
            case 'ff': str += '首次适应算法'; break;
            case 'nf': str += '循环首次适应算法'; break;
            case 'bf': str += '最佳适应算法'; break;
            case 'wf': str += '最坏适应算法'; break;
        }
        alert(str);
        switch(alg){
            case 'ff': FF(needSize); break;
            case 'nf': NF(needSize); break;
            case 'bf': BF(needSize); break;
            case 'wf': WF(needSize); break;
        }
    }else
        alert('作业所需内存不得为空、不得小于1KB，不得输入非数字字符！');
}

// 新建进程 固定分配
function newJob_f(){
    const needSize = parseInt(document.querySelector('#job-need-memory-f').value);
    let tempArr = copyArr(fixInfo.idleTable);
    // 最优适配
    // 根据内存大小排序
    if(needSize>=1){
        tempArr.sort((object1, object2)=>{
            return object1.size - object2.size; // 升序
        })
        console.log('BF arr: ', tempArr);
        for(let i=0;i<tempArr.length;i++){
            if(tempArr[i].size>=needSize && tempArr[i].status == 0){
                insertJob('f',needSize,tempArr[i].start); // 插入作业
                for(let j=0;j<tempArr.length;j++){
                    if(tempArr[i].id == fixInfo.idleTable[j].id){
                        fixInfo.idleTable[j].status = 1;
                        break;
                    }
                }
                renderIdleTable('f');
                alert('成功为该作业分配内存空间');
                return;
            }
        }
        alert('无法为该作业分配内存空间！');
    }else
        alert('作业所需内存不得为空、不得小于1KB，不得输入非数字字符！');
}

// --------------------------------
// 内存占用与分配示意
// --------------------------------
function displayAllocation(kind){
    let info = null;
    let occupyMsg = null;
    let canvasElement = null;
    const canvasW = 140;
    const canvasH = 530;
    const colorSeqence = [{ color:'white',bg:'#FF1493'},{ color:'#4f4f4f' ,bg:'#FFB6C1'}];
    if(kind == 'v'){
        info = varInfo;
        occupyMsg = document.querySelector('#sysInfo-occupy-v');
        canvasElement = document.querySelector('#canvas-v').getContext('2d');
    }else if(kind =='f'){
        info = fixInfo;
        occupyMsg = document.querySelector('#sysInfo-occupy-f');
        canvasElement = document.querySelector('#canvas-f').getContext('2d');
    }
    
    // 清空canvas画布
    canvasElement.clearRect(0,0,canvasW,canvasH);

    let tempArr = copyArr(info.jobsTable);
    // 最优适配
    // 根据内存大小排序
    tempArr.sort((object1, object2)=>{
        return object1.start - object2.start; // 升序
    })

    let occupiedMem = 0;
    for(let i=0;i<tempArr.length;i++){
        occupiedMem += tempArr[i].size;
        canvasElement.fillStyle = colorSeqence[i%2].bg;
        let y = tempArr[i].start*canvasH/info.sysMem;
        let h = tempArr[i].size*canvasH/info.sysMem;
        canvasElement.fillRect(0, y, canvasW, h);
        if(parseInt(h)>=15){
            canvasElement.fillStyle = colorSeqence[i%2].color;
            canvasElement.font = '14px 微软雅黑';
            canvasElement.fillText('Job '+tempArr[i].id, 45, y + 15);
        }

    }
    info.memOccupy = occupiedMem * 100 / info.sysMem;
    info.memOccupy = info.memOccupy.toFixed(2);
    occupyMsg.innerHTML = info.memOccupy + '%';
}

// 开启动态重定位
function openRePosition(){
    const checkbox = document.querySelector('#open_rePos');
    if(checkbox.checked == true){
        alert('已启用动态重定位分区分配！');
        varInfo.isRePos = true;
    }else if(checkbox.checked == false){
        alert('已关闭动态重定位分区分配！');
        varInfo.isRePos = false;
    }
}


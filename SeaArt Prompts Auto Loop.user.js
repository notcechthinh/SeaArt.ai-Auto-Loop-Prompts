// ==UserScript==
// @name         SeaArt Multi-Prompt Loop
// @namespace    tms.loop
// @version      1.7
// @description  Run multiple prompts automatically on SeaArt with ease
// @author       Thickmeister
// @match        https://*.seaart.ai/*
// @grant        none
// ==/UserScript==

(function(){
    'use strict';

    const MAX_PROMPTS = 5;
    const SCROLL_INTERVAL_MS = 700;
    const AFTER_GEN_COOLDOWN_MS = 400;
    const LOAD_TIMEOUT_MS = 120000;

    let looping = false;
    let isRunning = false;
    let totalLoopCount = 0;
    let scrollTimer = null;
    let promptItemsUI = [];
    let maxLoops = 0; // 0 = vô hạn

    // ---------- Helpers ----------
    function sleep(ms){return new Promise(res=>setTimeout(res,ms));}
    function getScrollableContainer(){
        const all=document.querySelectorAll("*");
        for(const el of all){
            try{
                const style=getComputedStyle(el);
                if(el.scrollHeight>el.clientHeight+50 && style.overflowY!=='visible' && style.overflowY!=='hidden') return el;
            }catch(e){}
        }
        return null;
    }
    function forceScrollDown(){
        const box=getScrollableContainer();
        if(box){ try{box.scrollTop=box.scrollHeight;}catch(e){} }
        else { try{window.scrollTo(0,document.body.scrollHeight);}catch(e){} }
    }
    function startAutoScroll(){if(scrollTimer) return; scrollTimer=setInterval(forceScrollDown,SCROLL_INTERVAL_MS);}
    function stopAutoScroll(){if(scrollTimer){clearInterval(scrollTimer);scrollTimer=null;}}

    function getPromptInputBox(){ return document.querySelector('textarea#easyGenerateInput'); }
    function getGenerateBtn(){ return document.querySelector('#generate-btn'); }
    function getLatestMessageBox(){ const boxes=document.querySelectorAll('.c-easy-msg-item'); return boxes.length?boxes[boxes.length-1]:null;}
    function messageSignature(node){if(!node) return null; if(node.dataset&&node.dataset.id) return 'id:'+node.dataset.id; const txt=(node.innerText||'').replace(/\s+/g,' ').slice(0,120).trim(); const imgs=(node.querySelectorAll('img')||[]).length; return 'txt:'+txt+'|imgs:'+imgs;}
    function getCurrentLoadPercent(box){const p=box?.querySelector('.message-process-container .progress-number'); if(p) return parseFloat(p.textContent.replace('%','').trim())||0; return 0;}
    async function waitForNewMessage(oldSig,timeoutMs=120000){
        const start=Date.now();
        for(;;){
            if(!looping) return null;
            const box=getLatestMessageBox();
            const sig=messageSignature(box);
            if(sig && sig!==oldSig) return {box,sig};
            if(Date.now()-start>timeoutMs) return null;
            await sleep(300);
        }
    }
    async function waitForMessageFinishOrTimeout(box,progressLabel,timeoutMs=120000){
        const start=Date.now();
        for(;;){
            if(!looping) return false;
            if(!box) return false;
            const imgs=box.querySelectorAll('img.media-attachments-img-show, img.media-attachments-img');
            if(imgs.length>0){ if(progressLabel) progressLabel.textContent='Progress: 100%'; return true;}
            const percent=getCurrentLoadPercent(box);
            if(progressLabel) progressLabel.textContent=`Progress: ${percent}%`;
            if(percent>=98 && Date.now()-start>LOAD_TIMEOUT_MS) return true;
            if(Date.now()-start>timeoutMs) return false;
            await sleep(400);
        }
    }

    // ---------- Button State ----------
    function setButtonState(running){
        if(running){
            startBtn.style.background='#3dcf58';
            stopBtn.style.background='#d9534f';
        } else {
            startBtn.style.background='#28a745';
            stopBtn.style.background='#e26b6b';
        }
    }

    // ---------- Main Loop ----------
    async function runPromptLoop(promptItemsUI,counterEl){
        if(isRunning) return;
        isRunning=true;
        while(looping){
            for(const item of promptItemsUI){
                const promptText=item.textarea.value.trim();
                const times=parseInt(item.timesInput.value||1,10);
                promptItemsUI.forEach(p=>p.textarea.style.backgroundColor='#444');
                item.textarea.style.backgroundColor='#28a745';

                for(let i=0;i<times;i++){
                    if(!looping) break;
                    const inputBox=getPromptInputBox();
                    const genBtn=getGenerateBtn();
                    if(!inputBox || !genBtn){await sleep(1000); i--; continue;}
                    inputBox.value=promptText;
                    inputBox.dispatchEvent(new Event('input',{bubbles:true}));
                    genBtn.click();

                    const oldSig=messageSignature(getLatestMessageBox());
                    const newMsg=await waitForNewMessage(oldSig);
                    if(!newMsg) continue;
                    await waitForMessageFinishOrTimeout(newMsg.box,item.progressLabel);
                    await sleep(AFTER_GEN_COOLDOWN_MS);
                }
                item.textarea.style.backgroundColor='#444';
            }

            totalLoopCount++;
            counterEl.textContent=`Total Loops: ${totalLoopCount}`;

            if(maxLoops > 0 && totalLoopCount >= maxLoops){
                looping=false;
                setButtonState(false);
            }
        }
        isRunning=false;
        stopAutoScroll();
        setButtonState(false);
    }

    // ---------- UI ----------
    const expandModal = document.createElement('div');
    const expandTextarea = document.createElement('textarea');
    const expandTitle = document.createElement('h2');
    let currentExpandItem = null;

    function createExpandModal(){
        expandModal.style.cssText = `
            position:fixed;inset:0;background:rgba(0,0,0,0.65);
            display:none;z-index:1000000;justify-content:center;align-items:center;
        `;
        const box=document.createElement('div');
        box.style.cssText=`width:50vw;height:40vh;background:#1f1f1f;color:white;display:flex;flex-direction:column;border-radius:10px;padding:20px;`;
        expandTitle.style.marginBottom='10px';
        expandTitle.textContent='Prompt';
        expandTextarea.style.cssText=`flex:1;background:#111;color:#fff;border:1px solid #444;border-radius:6px;padding:10px;font-size:15px;`;
        const btnDiv=document.createElement('div');
        btnDiv.style.cssText='margin-top:10px;display:flex;justify-content:flex-end;gap:10px;';
        const closeBtn=document.createElement('button');
        closeBtn.textContent='Close';
        closeBtn.style.cssText='padding:8px 16px;background:#d9534f;color:white;border:none;border-radius:6px;cursor:pointer;';
        closeBtn.onclick=()=>expandModal.style.display='none';
        const saveBtn=document.createElement('button');
        saveBtn.textContent='Save';
        saveBtn.style.cssText='padding:8px 16px;background:#28a745;color:white;border:none;border-radius:6px;cursor:pointer;';
        saveBtn.onclick=()=>{ if(currentExpandItem){currentExpandItem.textarea.value=expandTextarea.value;} expandModal.style.display='none'; };
        // Save bằng Enter
        expandTextarea.addEventListener('keydown',e=>{if(e.key==='Enter' && !e.shiftKey){e.preventDefault(); saveBtn.click();}});
        btnDiv.appendChild(closeBtn); btnDiv.appendChild(saveBtn);
        box.appendChild(expandTitle); box.appendChild(expandTextarea); box.appendChild(btnDiv);
        expandModal.appendChild(box);
        document.body.appendChild(expandModal);
    }

    let startBtn, stopBtn;

    function createUIPanel() {
        if(document.getElementById('dynamic-prompt-container')) return;
        createExpandModal();

        // Toggle button
        const toggleBtn = document.createElement('div');
        toggleBtn.id='prompt-toggle-btn';
        toggleBtn.textContent='▲';
        toggleBtn.title='Expand/Collapse Prompt UI';
        toggleBtn.style.cssText=`position:fixed;right:65px;bottom:20px;width:35px;height:35px;background:#28a745;color:#fff;text-align:center;line-height:35px;border-radius:50%;cursor:pointer;font-weight:bold;font-size:18px;user-select:none;box-shadow:0 4px 8px rgba(0,0,0,0.25);transition:0.2s;`;
        toggleBtn.onmouseover=()=>toggleBtn.style.transform='scale(1.2)';
        toggleBtn.onmouseout=()=>toggleBtn.style.transform='scale(1)';
        document.body.appendChild(toggleBtn);

        const panel = document.createElement('div');
        panel.id='dynamic-prompt-container';
        panel.style.cssText=`position:fixed;right:10px;bottom:155px;z-index:999999;background:#2b2b2b;border-radius:12px;padding:12px;width:300px;display:none;color:#fff;font-family:sans-serif;border:1px solid #000;box-shadow:0 6px 12px rgba(0,0,0,0.2);`;

        const promptNumberDiv=document.createElement('div');
        promptNumberDiv.style.marginBottom='8px';
        promptNumberDiv.innerHTML='Number of prompts: ';
        const promptNumberSelect=document.createElement('select');
        promptNumberSelect.style.marginLeft='4px';
        for(let i=1;i<=MAX_PROMPTS;i++){const opt=document.createElement('option'); opt.value=i; opt.textContent=i; promptNumberSelect.appendChild(opt);}
        promptNumberSelect.value='2';
        promptNumberDiv.appendChild(promptNumberSelect);
        panel.appendChild(promptNumberDiv);

        const maxLoopDiv=document.createElement('div');
        maxLoopDiv.style.marginBottom='8px';
        maxLoopDiv.innerHTML='Max Loops (0 = ∞): ';
        const maxLoopInput=document.createElement('input');
        maxLoopInput.type='number'; maxLoopInput.value=0; maxLoopInput.min=0; maxLoopInput.style.width='50px;margin-left:4px;';
        maxLoopDiv.appendChild(maxLoopInput);
        panel.appendChild(maxLoopDiv);

        const promptsContainer=document.createElement('div');
        panel.appendChild(promptsContainer);

        startBtn=document.createElement('div');
        startBtn.textContent='Start';
        startBtn.style.cssText='padding:8px;text-align:center;border-radius:6px;cursor:pointer;background:#28a745;color:#fff;margin-top:6px;font-weight:bold;transition:0.25s;';
        stopBtn=document.createElement('div');
        stopBtn.textContent='Stop';
        stopBtn.style.cssText='padding:8px;text-align:center;border-radius:6px;cursor:pointer;background:#d9534f;color:#fff;margin-top:6px;font-weight:bold;transition:0.25s;';

        const counterEl=document.createElement('div');
        counterEl.textContent='Total Loops: 0';
        counterEl.style.cssText='margin-top:6px;text-align:center;font-weight:bold;color:#fff;';

        const refreshBtn=document.createElement('div');
        refreshBtn.textContent='⟳';
        refreshBtn.title='Reset Panel';
        refreshBtn.style.cssText=`position:absolute;bottom:4px;right:12px;width:28px;height:28px;border-radius:50%;text-align:center;line-height:28px;cursor:pointer;background:#666;color:#fff;font-size:16px;font-weight:bold;transition:0.25s;`;
        refreshBtn.onmouseover=()=>refreshBtn.style.background='#888';
        refreshBtn.onmouseout=()=>refreshBtn.style.background='#666';

        refreshBtn.onclick=()=>{
            promptNumberSelect.value='2';
            maxLoopInput.value=0;
            rebuildPromptUI(2);
            totalLoopCount=0;
            counterEl.textContent=`Total Loops: ${totalLoopCount}`;
        };

        panel.appendChild(startBtn);
        panel.appendChild(stopBtn);
        panel.appendChild(counterEl);
        panel.appendChild(refreshBtn);
        document.body.appendChild(panel);

        toggleBtn.onclick=()=>{
            if(panel.style.display==='none'){panel.style.display='block'; toggleBtn.textContent='▼'; toggleBtn.style.background='#d9534f';}
            else{panel.style.display='none'; toggleBtn.textContent='▲'; toggleBtn.style.background='#28a745';}
        };

        function rebuildPromptUI(num){
            promptsContainer.innerHTML=''; promptItemsUI=[];
            for(let i=0;i<num;i++){
                const pDiv=document.createElement('div'); pDiv.style.marginBottom='8px'; pDiv.style.position='relative';
                const textarea=document.createElement('textarea'); textarea.rows=3; textarea.placeholder=`Prompt ${i+1}`;
                textarea.style.cssText='width:100%;background:#444;color:#fff;border:1px solid #666;border-radius:4px;padding:4px;font-size:13px;';
                const timesInput=document.createElement('input'); timesInput.type='number'; timesInput.value=1; timesInput.min=1; timesInput.style.width='50px;margin-left:4px;';
                const label=document.createElement('label'); label.textContent='Times: '; label.appendChild(timesInput);
                const progressLabel=document.createElement('div'); progressLabel.textContent='Progress: 0%'; progressLabel.style.cssText='font-size:12px;color:#fff;margin-top:2px;';

                // Expand button
                const expandBtn=document.createElement('div');
                expandBtn.textContent='✏';
                expandBtn.style.cssText='position:absolute;right:4px;top:4px;width:22px;height:22px;border-radius:5px;background:#3b82f6;color:white;text-align:center;line-height:22px;cursor:pointer;font-size:14px;';
                expandBtn.onclick=()=>{
                    currentExpandItem={textarea};
                    expandModal.style.display='flex';
                    expandTextarea.value=textarea.value;
                    expandTitle.textContent=`Prompt ${i+1}`;
                };

                pDiv.appendChild(textarea);
                pDiv.appendChild(expandBtn);
                pDiv.appendChild(label);
                pDiv.appendChild(progressLabel);
                promptsContainer.appendChild(pDiv);
                promptItemsUI.push({textarea,timesInput,progressLabel});
            }
        }

        rebuildPromptUI(parseInt(promptNumberSelect.value));
        promptNumberSelect.onchange=()=>rebuildPromptUI(parseInt(promptNumberSelect.value));

        startBtn.onclick=()=>{
            if(looping) return;
            looping=true;
            totalLoopCount=0;
            counterEl.textContent=`Total Loops: ${totalLoopCount}`;
            maxLoops=parseInt(maxLoopInput.value)||0;
            startAutoScroll();
            setButtonState(true);
            if(!isRunning) runPromptLoop(promptItemsUI,counterEl);
        };

        stopBtn.onclick=()=>{
            if(!looping) return;
            looping=false;
            stopAutoScroll();
            setButtonState(false);
        };
    }

    window.addEventListener('load',()=>setTimeout(createUIPanel,600));
})();

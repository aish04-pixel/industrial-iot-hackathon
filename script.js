// WiredMinds Industrial IoT dashboard
// The dashboard currently uses mock data. Later, replace the functions in this file
// with calls to your FastAPI backend (REST + WebSocket). Do not connect the browser
// directly to your MQTT broker.

const devices = [
  {id:"MTR-001",name:"Motor 01",line:"Production line A",temperature:68.4,vibration:2.1,rpm:1480,status:"Healthy",online:true},
  {id:"MTR-002",name:"Motor 02",line:"Production line A",temperature:72.1,vibration:2.8,rpm:1450,status:"Warning",online:true},
  {id:"MTR-003",name:"Motor 03",line:"Production line B",temperature:81.6,vibration:5.4,rpm:1390,status:"Critical",online:true},
  {id:"PMP-004",name:"Pump 04",line:"Cooling system",temperature:59.2,vibration:1.6,rpm:0,status:"Offline",online:false},
  {id:"CMP-005",name:"Compressor 05",line:"Production line C",temperature:63.7,vibration:2.0,rpm:1380,status:"Healthy",online:true}
];

let alerts = [
  {id:1,severity:"Critical",title:"High vibration detected",device:"Motor 03",detail:"Vibration reached 5.4 mm/s · Production line B",time:"2 min ago",state:"Active"},
  {id:2,severity:"Critical",title:"Temperature threshold exceeded",device:"Motor 03",detail:"Temperature reached 81.6°C · Motor bearing",time:"8 min ago",state:"Active"},
  {id:3,severity:"Warning",title:"Vibration above normal range",device:"Motor 02",detail:"Vibration reached 2.8 mm/s · Production line A",time:"19 min ago",state:"Active"},
  {id:4,severity:"Resolved",title:"Connection restored",device:"Pump 04",detail:"Device connection recovered after brief interruption",time:"1 hr ago",state:"Resolved"}
];

let selectedDeviceId = "MTR-001";
let toastTimer;
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];

function statusClass(status){ return `status-${status.toLowerCase()}`; }
function statusPill(status){ return `<span class="status-pill ${statusClass(status)}">${status}</span>`; }
function showToast(message){
  const toast=$("#toast"); toast.textContent=message; toast.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove("show"),2600);
}
function setView(view){
  $$(".page").forEach(page=>page.classList.remove("active-page"));
  const target=$(`#${view}View`); if(target) target.classList.add("active-page");
  $$(".nav-item").forEach(item=>item.classList.toggle("active",item.dataset.view===view));
  $("#breadcrumbCurrent").textContent=view.charAt(0).toUpperCase()+view.slice(1);
  $("#sidebar").classList.remove("open");
  if(view==="analytics") setTimeout(()=>drawChart("analyticsChart",true),30);
}
function renderOverview(){
  $("#totalDevices").textContent=String(devices.length).padStart(2,"0");
  $("#onlineDevices").textContent=String(devices.filter(d=>d.online).length).padStart(2,"0");
  $("#activeAlerts").textContent=String(alerts.filter(a=>a.state==="Active").length).padStart(2,"0");
  $("#deviceTableBody").innerHTML=devices.map(d=>`<tr>
    <td><div class="device-name-cell"><span class="mini-device">⚙</span><div><strong>${d.name}</strong><small>${d.id}</small></div></div></td>
    <td>${d.temperature.toFixed(1)} °C</td><td>${d.vibration.toFixed(1)} mm/s</td><td>${d.rpm.toLocaleString()}</td><td>${statusPill(d.status)}</td>
  </tr>`).join("");
  $("#recentAlerts").innerHTML=alerts.slice(0,3).map(alert=>`<div class="recent-alert">
    <span class="alert-symbol ${alert.severity.toLowerCase()}">${alert.severity==="Warning"?"!":"×"}</span>
    <div class="recent-alert-copy"><strong>${alert.title}</strong><small>${alert.device} · ${alert.time}</small></div>
  </div>`).join("");
  $("#criticalCount").textContent=alerts.filter(a=>a.severity==="Critical"&&a.state==="Active").length;
  $("#warningCount").textContent=alerts.filter(a=>a.severity==="Warning"&&a.state==="Active").length;
  $("#resolvedCount").textContent=alerts.filter(a=>a.state==="Resolved").length;
  $(".alert-count").textContent=alerts.filter(a=>a.state==="Active").length;
}
function renderDevices(){
  const query=($("#deviceSearch")?.value||"").toLowerCase();
  const status=$("#statusFilter")?.value||"all";
  const filtered=devices.filter(d=>(d.name.toLowerCase().includes(query)||d.id.toLowerCase().includes(query))&&(status==="all"||d.status===status));
  $("#deviceCards").innerHTML=filtered.length?filtered.map(d=>`<article class="device-card">
    <div class="device-card-top"><div class="device-card-title"><span class="mini-device">⚙</span><div><strong>${d.name}</strong><small>${d.id} · ${d.line}</small></div></div>${statusPill(d.status)}</div>
    <div class="device-metrics"><div><span>TEMPERATURE</span><strong>${d.temperature.toFixed(1)}°C</strong></div><div><span>VIBRATION</span><strong>${d.vibration.toFixed(1)}</strong></div><div><span>SPEED</span><strong>${d.rpm.toLocaleString()}</strong></div></div>
    <div class="device-card-bottom"><span>${d.online?"● Connected":"○ Disconnected"}</span><button data-control-device="${d.id}">Open controls →</button></div>
  </article>`).join(""):`<div class="empty-state">No devices match your search.</div>`;
}
function renderAlerts(){
  const filter=$("#alertFilter")?.value||"all";
  const filtered=alerts.filter(a=>filter==="all"||a.state===filter);
  $("#allAlerts").innerHTML=filtered.length?filtered.map(a=>`<div class="alert-row">
    <span class="alert-symbol ${a.severity.toLowerCase()==="resolved"?"critical":a.severity.toLowerCase()}">${a.state==="Resolved"?"✓":"!"}</span>
    <div class="alert-row-main"><strong>${a.title}</strong><p>${a.device} · ${a.detail}</p></div>
    <div class="alert-row-meta"><span>${a.time}</span>${a.state==="Active"?`<button class="ack-button" data-ack="${a.id}">Acknowledge</button>`:`<span class="resolved-tag">✓ Resolved</span>`}</div>
  </div>`).join(""):`<div class="empty-state">No events in this view.</div>`;
}
function renderControlDevices(){
  $("#controlDeviceList").innerHTML=devices.map(d=>`<button class="control-device ${d.id===selectedDeviceId?"selected":""}" data-select-device="${d.id}">
    <span class="mini-device">⚙</span><div><strong>${d.name}</strong><small>${d.id}</small></div>${statusPill(d.status)}
  </button>`).join("");
  const d=devices.find(x=>x.id===selectedDeviceId)||devices[0];
  $("#selectedDeviceLabel").textContent=`Selected: ${d.name}`;
  $("#selectedDeviceName").textContent=d.name;
  $("#selectedDeviceId").textContent=`${d.id} · ${d.line}`;
  $("#selectedDeviceStatus").className=`status-pill ${statusClass(d.status)}`;
  $("#selectedDeviceStatus").textContent=d.status;
}
function drawChart(canvasId,large=false){
  const canvas=document.getElementById(canvasId); if(!canvas)return;
  const rect=canvas.getBoundingClientRect(); if(!rect.width||!rect.height)return;
  const dpr=window.devicePixelRatio||1; canvas.width=rect.width*dpr; canvas.height=rect.height*dpr;
  const ctx=canvas.getContext("2d");ctx.scale(dpr,dpr);
  const w=rect.width,h=rect.height,pad={l:large?35:28,r:10,t:12,b:large?25:10};
  const values1=[59,61,60,64,63,66,64,67,65,69,67,68.4];
  const values2=[62,62,64,63,66,65,68,67,69,70,71,72.1];
  const min=45,max=90;
  const x=i=>pad.l+(w-pad.l-pad.r)*i/(values1.length-1);
  const y=v=>pad.t+(h-pad.t-pad.b)*(max-v)/(max-min);
  ctx.font="9px DM Sans";ctx.fillStyle="#71839b";ctx.strokeStyle="#26364b";ctx.lineWidth=1;
  [50,60,70,80,90].forEach(v=>{ctx.beginPath();ctx.moveTo(pad.l,y(v));ctx.lineTo(w-pad.r,y(v));ctx.stroke();if(large)ctx.fillText(String(v),4,y(v)+3);});
  function line(values,color,fill){ctx.beginPath();values.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.strokeStyle=color;ctx.lineWidth=2;ctx.lineJoin="round";ctx.stroke();if(fill){ctx.lineTo(x(values.length-1),h-pad.b);ctx.lineTo(x(0),h-pad.b);ctx.closePath();ctx.fillStyle=fill;ctx.fill();}}
  line(values1,"#36d6bd","rgba(54,214,189,.07)");line(values2,"#a58bff",null);
  if(large){["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00"].forEach((t,i)=>{ctx.fillStyle="#71839b";ctx.fillText(t,pad.l+(w-pad.l-pad.r)*i/10-13,h-5);});}
}
function sendDemoCommand(command){
  const d=devices.find(x=>x.id===selectedDeviceId);
  if(!d)return;
  const time=new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  const log=$("#commandLog");
  if(log.querySelector(".empty-log"))log.innerHTML="";
  const entry=document.createElement("div");entry.className="command-entry";
  entry.innerHTML=`<span><strong>${command}</strong> → ${d.name}</span><small>${time} · SIMULATED</small>`;
  log.prepend(entry);
  if(command==="START"){d.online=true;d.rpm=d.rpm||1400;if(d.status==="Offline")d.status="Healthy";}
  if(command==="STOP")d.rpm=0;
  if(command==="RESET"){d.temperature=60;d.vibration=1.5;if(d.status==="Critical")d.status="Warning";}
  renderOverview();renderDevices();renderControlDevices();
  showToast(`${command} command simulated for ${d.name}. No physical device was controlled.`);
}
function exportReport(){
  const rows=[["Device ID","Name","Temperature C","Vibration mm/s","RPM","Status"],...devices.map(d=>[d.id,d.name,d.temperature,d.vibration,d.rpm,d.status])];
  const csv=rows.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download="wiredminds-device-report.csv";a.click();URL.revokeObjectURL(url);
  showToast("Device report exported.");
}
function refreshDemo(){
  devices.forEach(d=>{if(d.online){d.temperature=+(d.temperature+(Math.random()-.5)*1.2).toFixed(1);d.vibration=+(Math.max(.5,d.vibration+(Math.random()-.5)*.2)).toFixed(1);}});
  $("#lastUpdated").textContent="just now";renderOverview();renderDevices();renderControlDevices();
  drawChart("telemetryChart");if($("#analyticsView").classList.contains("active-page"))drawChart("analyticsChart",true);
  showToast("Sample telemetry refreshed.");
}

document.addEventListener("click",event=>{
  const nav=event.target.closest("[data-view]");if(nav){setView(nav.dataset.view);return;}
  const ack=event.target.closest("[data-ack]");if(ack){const item=alerts.find(a=>a.id===Number(ack.dataset.ack));if(item)item.state="Resolved";renderAlerts();renderOverview();showToast("Alert acknowledged.");return;}
  const select=event.target.closest("[data-select-device]");if(select){selectedDeviceId=select.dataset.selectDevice;renderControlDevices();return;}
  const openControl=event.target.closest("[data-control-device]");if(openControl){selectedDeviceId=openControl.dataset.controlDevice;renderControlDevices();setView("controls");return;}
  const command=event.target.closest("[data-command]");if(command){sendDemoCommand(command.dataset.command);return;}
});
$("#deviceSearch").addEventListener("input",renderDevices);
$("#statusFilter").addEventListener("change",renderDevices);
$("#alertFilter").addEventListener("change",renderAlerts);
$("#mobileMenu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#refreshBtn").addEventListener("click",refreshDemo);
$("#exportBtn").addEventListener("click",exportReport);
$("#clearResolvedBtn").addEventListener("click",()=>{alerts=alerts.filter(a=>a.state!=="Resolved");renderAlerts();renderOverview();showToast("Resolved events cleared from this view.");});
$("#addDeviceBtn").addEventListener("click",()=>showToast("Device registration will be connected to the backend later."));
$$("[data-command]").forEach(btn=>btn.addEventListener("keydown",e=>{if(e.key==="Enter")sendDemoCommand(btn.dataset.command);}));
window.addEventListener("resize",()=>{drawChart("telemetryChart");if($("#analyticsView").classList.contains("active-page"))drawChart("analyticsChart",true);});

renderOverview();renderDevices();renderAlerts();renderControlDevices();
requestAnimationFrame(()=>drawChart("telemetryChart"));

(()=>{
"use strict";

const DAY=86400000;
const STATUSES=Object.freeze(["priority","overdue","due-soon","scheduled"]);
const DRAFT_STATUSES=Object.freeze(["confirmed-current","needs-change","needs-source"]);
const evidenceGap=new Set(["topic-reference","applied-reference"]);

const clean=value=>String(value??"").trim();
const iso=value=>/^\d{4}-\d{2}-\d{2}$/.test(clean(value))?clean(value):"";
const atNoon=value=>new Date(`${value}T12:00:00Z`).getTime();
const daysUntil=(date,today)=>Math.ceil((atNoon(date)-atNoon(today))/DAY);
const statusOf=(question,today)=>{
  const remaining=daysUntil(question.reviewDueOn,today);
  return remaining<0?"overdue":remaining<=14?"due-soon":"scheduled";
};
const urgencyOf=(question,today)=>{
  const status=statusOf(question,today);
  if(status==="overdue") return 0;
  if(status==="due-soon") return 1;
  if(question.freshnessClass==="time-sensitive") return 2;
  if(evidenceGap.has(question.verificationStatus)) return 3;
  if(question.freshnessClass==="law-watch") return 4;
  return 5;
};

function buildQueue(questions,filters={},today=new Date().toISOString().slice(0,10)){
  const safeToday=iso(today)||new Date().toISOString().slice(0,10);
  const status=STATUSES.includes(filters.status)?filters.status:"priority";
  const query=clean(filters.query).toLocaleLowerCase("th");
  return (questions||[]).filter(question=>{
    const computed=statusOf(question,safeToday);
    if(status!=="priority"&&computed!==status) return false;
    if(filters.freshness&&filters.freshness!=="all"&&question.freshnessClass!==filters.freshness) return false;
    if(filters.evidence==="gap"&&!evidenceGap.has(question.verificationStatus)) return false;
    if(filters.evidence&&!["all","gap"].includes(filters.evidence)&&question.verificationStatus!==filters.evidence) return false;
    if(filters.module&&filters.module!=="all"&&question.module!==filters.module) return false;
    if(query&&!`${question.id} ${question.question} ${question.type} ${question.sourceDocument||question.source} ${question.sourceLocator}`.toLocaleLowerCase("th").includes(query)) return false;
    return true;
  }).sort((a,b)=>{
    const urgency=urgencyOf(a,safeToday)-urgencyOf(b,safeToday);
    if(urgency) return urgency;
    const due=String(a.reviewDueOn).localeCompare(String(b.reviewDueOn));
    return due||a.id-b.id;
  });
}

function summarize(questions,today=new Date().toISOString().slice(0,10)){
  const safeToday=iso(today)||new Date().toISOString().slice(0,10);
  return (questions||[]).reduce((summary,question)=>{
    summary.total++;
    summary[statusOf(question,safeToday)]++;
    if(question.freshnessClass==="time-sensitive") summary.timeSensitive++;
    if(evidenceGap.has(question.verificationStatus)) summary.evidenceGap++;
    return summary;
  },{total:0,overdue:0,"due-soon":0,scheduled:0,timeSensitive:0,evidenceGap:0});
}

function checklist(question){
  const items=[
    "เปิดต้นทางจากหน่วยงานทางการและตรวจวันที่เผยแพร่/แก้ไขล่าสุด",
    "เทียบคำถาม ตัวเลือก เฉลย และคำอธิบายกับหลักฐานเดียวกัน",
    "ตรวจว่าตัวลวงสมจริงและไม่เผยเฉลยจากความยาวหรือถ้อยคำสุดโต่ง"
  ];
  if(question.freshnessClass==="time-sensitive") items.push("ตรวจตัวเลข ชื่อบุคคล ช่วงเวลา และสถานะเหตุการณ์ ณ วันที่ทบทวน");
  if(question.freshnessClass==="law-watch") items.push("ตรวจฉบับแก้ไข วันที่มีผลใช้บังคับ บทเฉพาะกาล และหน่วยงานผู้มีอำนาจ");
  if(evidenceGap.has(question.verificationStatus)) items.push("พยายามชี้หน้า มาตรา หรือหน้าต้นทางตรง; หากยังยืนยันไม่ได้ให้คงป้ายระดับหัวข้อ/ประยุกต์");
  if(/นโยบาย|หนังสือเวียน|ว \d+\//.test(`${question.type} ${question.question}`)) items.push("แยกนโยบาย/หนังสือเวียนออกจากตัวบทกฎหมาย และบันทึกเลขที่เอกสารให้ครบ");
  return items;
}

function normalizeDraft(value={}){
  const sourceUrl=clean(value.sourceUrl);
  return {
    questionId:Math.max(0,Math.floor(Number(value.questionId)||0)),
    status:DRAFT_STATUSES.includes(value.status)?value.status:"confirmed-current",
    finding:clean(value.finding).slice(0,1200),
    sourceUrl:/^https:\/\/[^\s]+$/i.test(sourceUrl)?sourceUrl:"",
    reviewedOn:iso(value.reviewedOn),
    notes:clean(value.notes).slice(0,2000),
    savedAt:Number(value.savedAt)||Date.now()
  };
}

function validateDraft(value){
  const draft=normalizeDraft(value);
  const errors=[];
  if(!draft.questionId) errors.push("ไม่พบรหัสข้อสอบ");
  if(!draft.reviewedOn) errors.push("กรุณาระบุวันที่ตรวจ");
  if(!draft.sourceUrl) errors.push("กรุณาใช้ลิงก์ HTTPS จากต้นทางที่ตรวจสอบได้");
  if(draft.status!=="confirmed-current"&&!draft.finding) errors.push("กรุณาระบุสิ่งที่พบหรือสิ่งที่ต้องแก้");
  return {ok:errors.length===0,draft,errors};
}

function buildAIBrief(question,value={}){
  const draft=normalizeDraft({...value,questionId:question.id});
  return [
    "บทบาท: ผู้ช่วยตรวจข้อสอบครูผู้ช่วย โดยใช้แหล่งทางการและไม่แต่งข้อมูล",
    "ข้อห้าม: ห้ามแก้หรือเผยแพร่คำถามอัตโนมัติ ห้ามสร้างเลขหน้า/มาตราเมื่อยังไม่ยืนยัน",
    `วันที่ตรวจ: ${draft.reviewedOn||"ยังไม่ระบุ"}`,
    `ข้อสอบ #${question.id} | หมวด ${question.module} | ${question.type}`,
    `คำถาม: ${question.question}`,
    `ตัวเลือก: ${question.options.map((option,index)=>`${index+1}. ${option}`).join(" | ")}`,
    `เฉลยปัจจุบัน: ${question.answer+1}. ${question.options[question.answer]}`,
    `คำอธิบายปัจจุบัน: ${question.explanation}`,
    `หลักฐานปัจจุบัน: ${question.sourceDocument||question.source} — ${question.sourceLocator}`,
    `ลิงก์ที่ผู้ดูแลเสนอ: ${draft.sourceUrl||question.sourceUrl||"ยังไม่มี"}`,
    `สิ่งที่พบ: ${draft.finding||"ให้ตรวจความถูกต้องและความเป็นปัจจุบัน"}`,
    "ผลลัพธ์ที่ต้องการ: สรุปข้อเท็จจริงที่ยืนยันได้, จุดที่ควรแก้, ถ้อยคำคำถาม/ตัวเลือกที่สมดุล และรายการหลักฐานพร้อมวันที่ โดยทำเครื่องหมายสิ่งที่ยังไม่แน่ใจอย่างชัดเจน"
  ].join("\n");
}

function buildUpdatePack(drafts,metadata={}){
  const safeDrafts=Object.values(drafts||{}).map(normalizeDraft).filter(draft=>draft.questionId&&draft.reviewedOn&&draft.sourceUrl);
  return {
    schema:"teacher-quest-content-review/v1",
    generatedAt:new Date().toISOString(),
    bankVersion:clean(metadata.bankVersion),
    evidenceReviewedOn:iso(metadata.evidenceReviewedOn),
    policy:"human-approval-required",
    containsPlayerData:false,
    drafts:safeDrafts.sort((a,b)=>a.questionId-b.questionId)
  };
}

window.TeacherQuestContentReview=Object.freeze({buildQueue,summarize,statusOf,daysUntil,checklist,normalizeDraft,validateDraft,buildAIBrief,buildUpdatePack});
})();

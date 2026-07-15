(()=>{
  "use strict";

  function simplifyCoach(){
    const root = document.querySelector("#view");
    if(!root) return;

    const heading = [...root.querySelectorAll(".section-head h2")]
      .find(node => node.textContent.trim() === "สำรองข้อมูลและบัญชีฟรี");
    if(heading){
      const sectionHead = heading.closest(".section-head");
      const backupSection = sectionHead?.nextElementSibling;
      if(backupSection?.classList.contains("v4-grid")) backupSection.remove();
      sectionHead?.remove();
    }

    const intro = root.querySelector(".hero p");
    if(intro && intro.textContent.includes("สำรองความคืบหน้า")){
      intro.textContent = "วิเคราะห์ข้อที่ยังไม่แม่น จัดชุดฝึกเฉพาะจุด ใช้ไอเทมช่วยคิด และฝึกซ้ำอย่างเป็นระบบ";
    }

    const syncBadge = [...root.querySelectorAll(".float-badge")]
      .find(node => node.textContent.trim() === "FREE SYNC");
    if(syncBadge) syncBadge.textContent = "SMART DRILL";
  }

  const observer = new MutationObserver(simplifyCoach);
  observer.observe(document.querySelector("#view") || document.body,{childList:true,subtree:true});
  simplifyCoach();
})();

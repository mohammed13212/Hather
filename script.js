const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzH29iW9vZxWH9PMrTJk25W3x_pPOykxIN-5BgGdG80Dg-2UGU4OWlMEs40qP6dHl5w/exec";

const form = document.getElementById("form");
const uid = document.getElementById("uid");
const fieldBox = document.getElementById("fieldBox");
const help = document.getElementById("help");
const status = document.getElementById("status");
const btn = document.getElementById("btn");

let loading = false;

/* "يدعم أرقام عربي/فارسي/إنجليزي" */
const norm = (v) => {
  v = (v || "").toString();
  v = v.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  v = v.replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
  return v.replace(/\D/g, "").slice(0, 9);
};

/* "أي ضغط على البار يركز على خانة الإدخال" */
fieldBox.addEventListener("click", () => uid.focus());
fieldBox.addEventListener("touchstart", () => uid.focus(), { passive: true });

function setHasValue(){
  fieldBox.classList.toggle("has-value", uid.value.length > 0);
}

function validate(){
  uid.value = norm(uid.value);
  const v = uid.value;

  fieldBox.classList.remove("is-error","is-ok");
  setHasValue();

  if(!v){
    help.textContent = "أدخل الرقم الجامعي 9 أرقام.";
    btn.disabled = true;
    return false;
  }

  if(v.length < 9){
    fieldBox.classList.add("is-error");
    help.textContent = "❌ لازم 9 أرقام بالضبط.";
    btn.disabled = true;
    return false;
  }

  fieldBox.classList.add("is-ok");
  help.textContent = "✅ جاهز للتسجيل.";
  btn.disabled = loading;
  return true;
}

function jsonpSend(id){
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Date.now() + "_" + Math.random().toString(16).slice(2);
    const s = document.createElement("script");
    const t = setTimeout(() => clean(() => reject()), 12000);

    function clean(after){
      clearTimeout(t);
      try{ delete window[cb]; }catch{}
      if(s.parentNode) s.parentNode.removeChild(s);
      after && after();
    }

    window[cb] = data => clean(() => resolve(data));
    s.onerror = () => clean(() => reject());

    s.src = `${SCRIPT_URL}?uid=${encodeURIComponent(id)}&callback=${encodeURIComponent(cb)}&t=${Date.now()}`;
    document.body.appendChild(s);
  });
}

uid.addEventListener("input", () => {
  status.textContent = "";
  validate();
});

uid.addEventListener("blur", () => setHasValue());
uid.addEventListener("focus", () => setHasValue());

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if(loading) return;
  if(!validate()) return;

  loading = true;
  btn.disabled = true;
  status.textContent = "⏳ جاري التسجيل...";

  try{
    const res = await jsonpSend(uid.value);
    if(res?.status === "ok") status.textContent = "✅ تم تسجيل الحضور";
    else if(res?.status === "duplicate") status.textContent = "ℹ️ هذا الرقم مسجل مسبقًا اليوم";
    else status.textContent = "❌ " + (res?.message || "حدث خطأ");
  }catch{
    status.textContent = "❌ تعذر الاتصال بالنظام";
  }finally{
    loading = false;
    validate();
  }
});

validate();

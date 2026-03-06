const SCRIPT_URL =
"https://script.google.com/macros/s/AKfycbxdJNFo8oTpzr-Q6p2gBctKE3pbWw6Ueo351r-GjM6m2GraNN_gQsMKvi_j9P7MX0yq/exec";

const TEACHER_PASSWORD = "1111";

const form = document.getElementById("form");
const uid = document.getElementById("uid");
const fieldBox = document.getElementById("fieldBox");
const status = document.getElementById("status");
const btn = document.getElementById("btn");
const btnEn = document.getElementById("btnEn");
const btnAr = document.getElementById("btnAr");

const sessionBox = document.getElementById("sessionBox");
const courseValue = document.getElementById("courseValue");
const sectionValue = document.getElementById("sectionValue");
const lectureValue = document.getElementById("lectureValue");

const teacherFab = document.getElementById("teacherFab");
const teacherModal = document.getElementById("teacherModal");

const teacherPasswordPanel = document.getElementById("teacherPasswordPanel");
const teacherMainPanel = document.getElementById("teacherMainPanel");

const teacherClose = document.getElementById("teacherClose");
const teacherCloseMain = document.getElementById("teacherCloseMain");

const teacherPasswordForm = document.getElementById("teacherPasswordForm");
const teacherPassword = document.getElementById("teacherPassword");
const teacherPasswordStatus = document.getElementById("teacherPasswordStatus");

const teacherForm = document.getElementById("teacherForm");
const teacherResult = document.getElementById("teacherResult");
const generatedUrl = document.getElementById("generatedUrl");
const qrImage = document.getElementById("qrImage");
const copyBtn = document.getElementById("copyBtn");
const teacherStatus = document.getElementById("teacherStatus");

const courseInput = document.getElementById("course");
const sectionInput = document.getElementById("section");
const lectureInput = document.getElementById("lecture");

let loading = false;

const params = new URLSearchParams(window.location.search);
const course = (params.get("course") || "").trim();
const section = (params.get("section") || "").trim();
const lecture = (params.get("lecture") || "").trim();

if (course || section || lecture) {
  sessionBox.classList.remove("hidden");
  courseValue.textContent = course || "—";
  sectionValue.textContent = section || "—";
  lectureValue.textContent = lecture || "—";
}

const norm = (v) => {
  v = (v || "").toString();
  v = v.replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  return v.replace(/\D/g, "").slice(0, 9);
};

function setStatus(message = "", type = "") {
  status.textContent = message;
  status.className = "status";

  if (message) {
    status.classList.add("show");
  }

  if (type) {
    status.classList.add(type);
  }
}

function setButtonState() {
  if (loading) {
    btn.disabled = true;
    btnEn.textContent = "Loading...";
    btnAr.textContent = "جاري التسجيل...";
    return;
  }

  btnEn.textContent = "Check in";
  btnAr.textContent = "اضغط هنا";
  btn.disabled = uid.value.length !== 9;
}

function validate() {
  uid.value = norm(uid.value);

  if (uid.value.length > 0) {
    fieldBox.classList.add("has-value");
  } else {
    fieldBox.classList.remove("has-value");
  }

  setButtonState();
  return uid.value.length === 9;
}

uid.addEventListener("input", validate);

function jsonpSend(studentId) {
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    const s = document.createElement("script");

    function cleanup() {
      delete window[cb];
      if (s.parentNode) s.parentNode.removeChild(s);
    }

    window[cb] = (data) => {
      cleanup();
      resolve(data);
    };

    s.onerror = () => {
      cleanup();
      reject(new Error("Network error"));
    };

    const query = new URLSearchParams({
      uid: studentId,
      course,
      section,
      lecture,
      callback: cb
    });

    s.src = `${SCRIPT_URL}?${query.toString()}`;
    document.body.appendChild(s);

    setTimeout(() => {
      if (window[cb]) {
        cleanup();
        reject(new Error("Request timeout"));
      }
    }, 10000);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validate() || loading) return;

  if (!lecture) {
    setStatus("رابط الحضور غير صالح: رقم المحاضرة غير موجود", "error");
    return;
  }

  loading = true;
  setButtonState();
  setStatus("جاري التسجيل...", "");

  try {
    const res = await jsonpSend(uid.value);

    if (res && res.status === "ok") {
      setStatus("تم تسجيل الحضور بنجاح", "success");
      uid.value = "";
      fieldBox.classList.remove("has-value");
    } else if (res && res.status === "exists") {
      setStatus("تم تسجيل حضورك مسبقًا لهذه المحاضرة", "success");
    } else {
      setStatus((res && res.message) ? res.message : "حدث خطأ، حاول مرة أخرى", "error");
    }
  } catch (err) {
    setStatus("تعذر الاتصال، حاول مرة أخرى", "error");
  } finally {
    loading = false;
    validate();
  }
});

function openTeacherModal() {
  teacherModal.classList.remove("hidden");
  teacherPasswordPanel.classList.remove("hidden");
  teacherMainPanel.classList.add("hidden");
  teacherPassword.value = "";
  teacherPasswordStatus.textContent = "هذه اللوحة خاصة بالمدرس.";
  teacherPasswordStatus.className = "teacher-status";
}

function closeTeacherModal() {
  teacherModal.classList.add("hidden");
}

teacherFab.addEventListener("click", openTeacherModal);
teacherClose.addEventListener("click", closeTeacherModal);
teacherCloseMain.addEventListener("click", closeTeacherModal);

teacherModal.addEventListener("click", (e) => {
  if (e.target === teacherModal) {
    closeTeacherModal();
  }
});

teacherPasswordForm.addEventListener("submit", (e) => {
  e.preventDefault();

  if (teacherPassword.value === TEACHER_PASSWORD) {
    teacherPasswordPanel.classList.add("hidden");
    teacherMainPanel.classList.remove("hidden");
    teacherPasswordStatus.textContent = "تم الدخول بنجاح.";
    teacherPasswordStatus.className = "teacher-status success";
  } else {
    teacherPasswordStatus.textContent = "الرقم السري غير صحيح.";
    teacherPasswordStatus.className = "teacher-status error";
    teacherPassword.value = "";
  }
});

teacherForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const c = courseInput.value.trim();
  const s = sectionInput.value.trim();
  const l = lectureInput.value.trim();

  if (!c || !s || !l) {
    teacherResult.classList.add("hidden");
    teacherStatus.textContent = "أدخل Course و Section و Lecture أولًا.";
    teacherStatus.className = "teacher-status error";
    return;
  }

  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("course", c);
  url.searchParams.set("section", s);
  url.searchParams.set("lecture", l);

  const finalUrl = url.toString();

  generatedUrl.value = finalUrl;
  qrImage.src =
    "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" +
    encodeURIComponent(finalUrl);

  teacherResult.classList.remove("hidden");
  teacherStatus.textContent = "تم توليد الرابط والـ QR بنجاح.";
  teacherStatus.className = "teacher-status success";
});

copyBtn.addEventListener("click", async () => {
  const value = generatedUrl.value.trim();
  if (!value) return;

  try {
    await navigator.clipboard.writeText(value);
    teacherStatus.textContent = "تم نسخ الرابط.";
    teacherStatus.className = "teacher-status success";
  } catch (err) {
    generatedUrl.select();
    document.execCommand("copy");
    teacherStatus.textContent = "تم نسخ الرابط.";
    teacherStatus.className = "teacher-status success";
  }
});

validate();
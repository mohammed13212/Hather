const SCRIPT_URL =
"https://script.google.com/macros/s/AKfycbz022Vibr0kQpcExUbkIab2tEqiRfa60YVZbtmqjU4q6lPgsN8V7j4qG5vMyjGWBLU-/exec";

const TEACHER_PASSWORD = "1111";
const QR_ROTATE_MS = 20000;

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
const windowValue = document.getElementById("windowValue");

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
const windowMinutesInput = document.getElementById("windowMinutes");

let loading = false;
let qrTimer = null;
let activeTeacherSession = null;
let lastQrSlot = null;

const params = new URLSearchParams(window.location.search);
const course = (params.get("course") || "").trim();
const section = (params.get("section") || "").trim();
const lecture = (params.get("lecture") || "").trim();
const generatedAt = (params.get("generatedAt") || "").trim();
const windowMinutes = (params.get("windowMinutes") || "").trim();
const token = (params.get("token") || "").trim();
const slot = (params.get("slot") || "").trim();

if (course || section || lecture || windowMinutes) {
  sessionBox.classList.remove("hidden");
  courseValue.textContent = course || "—";
  sectionValue.textContent = section || "—";
  lectureValue.textContent = lecture || "—";
  windowValue.textContent = windowMinutes ? `${windowMinutes} min` : "—";
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

function jsonpRequest(paramsObj) {
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
      ...paramsObj,
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

function getCurrentSlot() {
  return Math.floor(Date.now() / QR_ROTATE_MS);
}

function getSecondsToNextRotation() {
  return Math.ceil((QR_ROTATE_MS - (Date.now() % QR_ROTATE_MS)) / 1000);
}

function isTeacherSessionExpired() {
  if (!activeTeacherSession) return true;

  const start = Number(activeTeacherSession.generatedAt);
  const minutes = Number(activeTeacherSession.windowMinutes);

  if (!start || !minutes) return true;

  return Date.now() > (start + minutes * 60 * 1000);
}

async function refreshTeacherQr(force = false) {
  if (!activeTeacherSession) return;

  if (isTeacherSessionExpired()) {
    stopQrRotation();
    teacherStatus.textContent = "انتهت مدة جلسة الحضور. أنشئ QR جديد.";
    teacherStatus.className = "teacher-status error";
    return;
  }

  const currentSlot = getCurrentSlot();

  if (!force && currentSlot === lastQrSlot) {
    updateTeacherCountdownOnly();
    return;
  }

  try {
    const res = await jsonpRequest({
      action: "generateToken",
      course: activeTeacherSession.course,
      section: activeTeacherSession.section,
      lecture: activeTeacherSession.lecture,
      generatedAt: activeTeacherSession.generatedAt,
      windowMinutes: activeTeacherSession.windowMinutes,
      slot: currentSlot
    });

    if (!res || res.status !== "ok") {
      teacherStatus.textContent = (res && res.message) ? res.message : "تعذر توليد QR.";
      teacherStatus.className = "teacher-status error";
      return;
    }

    lastQrSlot = currentSlot;

    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set("course", activeTeacherSession.course);
    url.searchParams.set("section", activeTeacherSession.section);
    url.searchParams.set("lecture", activeTeacherSession.lecture);
    url.searchParams.set("generatedAt", activeTeacherSession.generatedAt);
    url.searchParams.set("windowMinutes", activeTeacherSession.windowMinutes);
    url.searchParams.set("slot", String(res.slot));
    url.searchParams.set("token", res.token);

    const finalUrl = url.toString();

    generatedUrl.value = finalUrl;
    qrImage.src =
      "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" +
      encodeURIComponent(finalUrl);

    teacherResult.classList.remove("hidden");
    updateTeacherCountdownOnly();
  } catch (err) {
    teacherStatus.textContent = "تعذر تحديث QR.";
    teacherStatus.className = "teacher-status error";
  }
}

function updateTeacherCountdownOnly() {
  if (!activeTeacherSession) return;

  if (isTeacherSessionExpired()) {
    stopQrRotation();
    teacherStatus.textContent = "انتهت مدة جلسة الحضور. أنشئ QR جديد.";
    teacherStatus.className = "teacher-status error";
    return;
  }

  const seconds = getSecondsToNextRotation();
  teacherStatus.textContent = `تم توليد الرابط بنجاح. سيتغير QR بعد ${seconds} ثانية.`;
  teacherStatus.className = "teacher-status success";
}

function startQrRotation() {
  stopQrRotation();

  refreshTeacherQr(true);

  qrTimer = setInterval(() => {
    if (!activeTeacherSession) return;

    const currentSlot = getCurrentSlot();

    if (currentSlot !== lastQrSlot) {
      refreshTeacherQr(true);
    } else {
      updateTeacherCountdownOnly();
    }
  }, 1000);
}

function stopQrRotation() {
  if (qrTimer) {
    clearInterval(qrTimer);
    qrTimer = null;
  }
  lastQrSlot = null;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validate() || loading) return;

  if (!lecture) {
    setStatus("رابط الحضور غير صالح: رقم المحاضرة غير موجود", "error");
    return;
  }

  if (!generatedAt || !windowMinutes || !token || !slot) {
    setStatus("رابط الحضور غير مكتمل أو انتهت صلاحيته", "error");
    return;
  }

  loading = true;
  setButtonState();
  setStatus("جاري التسجيل...", "");

  try {
    const res = await jsonpRequest({
      action: "submitAttendance",
      uid: uid.value,
      course,
      section,
      lecture,
      generatedAt,
      windowMinutes,
      token,
      slot
    });

    if (res && res.status === "ok") {
      setStatus("✅ تم تسجيل الحضور بنجاح", "success");
      uid.value = "";
      fieldBox.classList.remove("has-value");
    } else if (res && res.status === "exists") {
      setStatus("⚠️ تم تسجيل حضورك مسبقًا لهذه المحاضرة", "success");
    } else if (res && res.status === "expired") {
      setStatus("⛔ انتهت مدة تسجيل الحضور أو انتهت صلاحية QR", "error");
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
  stopQrRotation();
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
  const wm = windowMinutesInput.value.trim();

  if (!c || !s || !l || !wm) {
    teacherResult.classList.add("hidden");
    teacherStatus.textContent = "أدخل Course و Section و Lecture ومدة فتح الحضور أولًا.";
    teacherStatus.className = "teacher-status error";
    return;
  }

  activeTeacherSession = {
    course: c,
    section: s,
    lecture: l,
    windowMinutes: wm,
    generatedAt: Date.now().toString()
  };

  startQrRotation();
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
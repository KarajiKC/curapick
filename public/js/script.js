document.addEventListener("DOMContentLoaded", () => {
  const navBrand = document.querySelector(".nav-brand")
  if (navBrand) {
    navBrand.addEventListener("click", () => {
      window.location.href = "index.html"
    })
  }

  const chatTab = document.querySelectorAll(".nav-tab")[1]
  if (chatTab) {
    chatTab.addEventListener("click", () => {
      window.location.href = "chat.html"
    })
  }

  const symptomInput = document.getElementById("symptom-input")
  if (symptomInput) {
    symptomInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        analyzeSymptoms()
      }
    })
  }
})

function scrollToInput() {
  document.getElementById("input-section").scrollIntoView({
    behavior: "smooth",
  })
}

function analyzeSymptoms() {
  const symptomInput = document.getElementById("symptom-input")
  const symptoms = symptomInput.value.trim()

  if (!symptoms) {
    alert("증상을 입력해주세요.")
    return
  }

  if (symptoms.length < 3) {
    alert("증상을 더 자세히 입력해주세요.")
    return
  }

  localStorage.setItem("symptoms", symptoms)
  window.location.href = "chat.html"
}

function goHome() {
  window.location.href = "index.html"
}
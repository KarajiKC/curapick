function startChat() {
  console.log("startChat 함수 호출됨")
  window.location.href = "chat.html"
}

function goToChat() {
  console.log("goToChat 함수 호출됨")
  window.location.href = "chat.html"
}

function goHome() {
  console.log("goHome 함수 호출됨")
  window.location.href = "index.html"
}

window.startChat = startChat
window.goToChat = goToChat
window.goHome = goHome

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM 로드 완료")

  const navBrand = document.querySelector(".nav-brand")
  if (navBrand) {
    navBrand.addEventListener("click", goHome)
    console.log("navBrand 이벤트 리스너 추가됨")
  }

  const chatTab = document.querySelectorAll(".nav-tab")[1]
  if (chatTab) {
    chatTab.addEventListener("click", goToChat)
    console.log("chatTab 이벤트 리스너 추가됨")
  }

  const ctaButton = document.querySelector(".cta-button")
  if (ctaButton) {
    ctaButton.addEventListener("click", startChat)
    console.log("ctaButton 이벤트 리스너 추가됨")
  }
})

console.log("script.js 로드됨")
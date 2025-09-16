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

  const startButton = document.querySelector(".cta-button")
  if (startButton) {
    startButton.addEventListener("click", () => {
      window.location.href = "chat.html"
    })
  }
})

function startChat() {
  window.location.href = "chat.html"
}

function goToChat() {
  window.location.href = "chat.html"
}

function goHome() {
  window.location.href = "index.html"
}
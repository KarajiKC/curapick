let isAnalyzing = false

document.addEventListener("DOMContentLoaded", () => {
  const navBrand = document.querySelector(".nav-brand")
  if (navBrand) {
    navBrand.addEventListener("click", () => {
      window.location.href = "index.html"
    })
  }

  const chatInput = document.getElementById("chat-input")
  if (chatInput) {
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    })
  }
})

async function sendMessage() {
  const chatInput = document.getElementById("chat-input")
  const message = chatInput.value.trim()

  if (!message || isAnalyzing) {
    return
  }

  if (message.length < 3) {
    alert("증상을 더 자세히 입력해주세요.")
    return
  }

  addMessage("user", message)
  chatInput.value = ""

  isAnalyzing = true
  addTypingIndicator()

  try {
    const analysisResponse = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symptoms: message }),
    })

    const analysisResult = await analysisResponse.json()

    if (!analysisResponse.ok) {
      throw new Error(analysisResult.error || "분석 중 오류가 발생했습니다.")
    }

    removeTypingIndicator()

    addMessage("bot", analysisResult.fullAnalysis)

    const searchResponse = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keywords: analysisResult.keywords }),
    })

    const searchResult = await searchResponse.json()
    const products = searchResult.products || []

    displayProducts(products)
  } catch (error) {
    console.error("분석 중 오류:", error)
    removeTypingIndicator()
    addMessage("bot", "죄송합니다. 분석 중 오류가 발생했습니다. 다시 시도해주세요.")
  } finally {
    isAnalyzing = false
  }
}

function addMessage(role, content) {
  const messagesContainer = document.getElementById("chat-messages")
  const messageDiv = document.createElement("div")
  messageDiv.className = `message ${role}-message`

  if (role === "user") {
    messageDiv.innerHTML = `
      <div class="message-content user-content">${escapeHtml(content)}</div>
    `
  } else {
    messageDiv.innerHTML = `
      <div class="bot-avatar"></div>
      <div class="message-content">${content.replace(/\n/g, "<br>")}</div>
    `
  }

  messagesContainer.appendChild(messageDiv)
  messagesContainer.scrollTop = messagesContainer.scrollHeight
}

function addTypingIndicator() {
  const messagesContainer = document.getElementById("chat-messages")
  const typingDiv = document.createElement("div")
  typingDiv.className = "message bot-message typing-indicator"
  typingDiv.innerHTML = `
    <div class="bot-avatar"></div>
    <div class="message-content">
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      분석 중입니다...
    </div>
  `
  messagesContainer.appendChild(typingDiv)
  messagesContainer.scrollTop = messagesContainer.scrollHeight
}

function removeTypingIndicator() {
  const typingIndicator = document.querySelector(".typing-indicator")
  if (typingIndicator) {
    typingIndicator.remove()
  }
}

function displayProducts(products) {
  const recommendationsSection = document.getElementById("recommendations-section")
  const productsGrid = document.getElementById("chat-products-grid")

  if (products.length > 0) {
    productsGrid.innerHTML = products
      .map(
        (product, index) => `
          <div class="product-card" style="animation-delay: ${index * 0.1}s">
            <h3 class="product-title">${escapeHtml(product.title)}</h3>
            <p class="product-description">${escapeHtml(product.description)}</p>
            <div class="product-ingredients">
              <h4>🔍 관련 키워드</h4>
              <p>${escapeHtml(product.keyword)}</p>
            </div>
            <div class="product-source">
              <small><strong>출처:</strong> ${escapeHtml(product.source)}</small><br>
              <small><strong>도메인:</strong> ${escapeHtml(getHostname(product.link))}</small><br>
              <small><strong>검색일:</strong> ${new Date().toLocaleDateString("ko-KR")}</small>
            </div>
            <a href="${product.link}" target="_blank" rel="noopener noreferrer" class="product-link">
              자세히 보기 →
            </a>
          </div>
        `,
      )
      .join("")

    recommendationsSection.style.display = "block"

    setTimeout(() => {
      recommendationsSection.scrollIntoView({ behavior: "smooth" })
    }, 500)
  } else {
    productsGrid.innerHTML = `
      <div class="no-products">
        <div class="no-products-icon">🔍</div>
        <h3>제품을 찾을 수 없습니다</h3>
        <p>죄송합니다. 관련 제품을 찾을 수 없습니다.<br>다른 증상으로 다시 검색해보세요.</p>
      </div>
    `
    recommendationsSection.style.display = "block"
  }
}

function getHostname(url) {
  try {
    return new URL(url).hostname
  } catch (error) {
    return "알 수 없음"
  }
}

function goHome() {
  window.location.href = "index.html"
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}
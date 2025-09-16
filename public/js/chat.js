const GROQ_API_KEY = process.env.GROQ_API_KEY || ""
const SERPER_API_KEY = process.env.SERPER_API_KEY || ""

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

  const symptoms = localStorage.getItem("symptoms")
  if (symptoms && symptoms.trim().length > 0) {
    addMessage("user", symptoms)
    localStorage.removeItem("symptoms")
    setTimeout(() => {
      sendMessageWithText(symptoms)
    }, 500)
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

  await sendMessageWithText(message)
}

async function sendMessageWithText(message) {
  if (isAnalyzing) return

  isAnalyzing = true
  addTypingIndicator()

  try {
    const analysisResult = await analyzeWithGroq(message)
    removeTypingIndicator()
    addMessage("bot", analysisResult.fullAnalysis)

    const products = await searchProducts(analysisResult.keywords)
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

async function analyzeWithGroq(symptoms) {
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symptoms }),
    })

    if (!response.ok) {
      throw new Error("API 호출 실패")
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || "API 응답 오류")
    }

    return {
      fullAnalysis: data.analysis,
      keywords: data.keywords || ["건강보조식품", "영양제", "비타민"],
    }
  } catch (error) {
    console.error("Groq API 오류:", error)
    return {
      fullAnalysis: `
        죄송합니다. 현재 AI 분석 서비스에 일시적인 문제가 발생했습니다.<br><br>
        일반적인 건강 관리 방법:<br>
        • 충분한 수면과 휴식<br>
        • 균형 잡힌 영양 섭취<br>
        • 적절한 운동<br>
        • 스트레스 관리<br><br>
        <strong>⚠️ 중요:</strong> 지속적이거나 심각한 증상의 경우 반드시 전문의와 상담하시기 바랍니다.
      `,
      keywords: ["종합비타민", "건강보조식품", "영양제"],
    }
  }
}

async function searchProducts(keywords) {
  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keywords }),
    })

    if (!response.ok) {
      throw new Error("검색 API 호출 실패")
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || "검색 API 응답 오류")
    }

    return data.products || []
  } catch (error) {
    console.error("제품 검색 중 오류:", error)
    return getSampleProducts(keywords[0] || "건강보조식품")
  }
}

function getSampleProducts(keyword) {
  return [
    {
      title: `${keyword} 관련 건강보조식품`,
      description: "현재 실시간 검색 결과를 가져올 수 없어 샘플 정보를 표시합니다.",
      link: `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword + " 건강보조식품")}`,
      keyword: keyword,
      source: "쿠팡",
      displayedLink: "coupang.com",
      isPremium: true,
    },
  ]
}

function displayProducts(products) {
  const recommendationsSection = document.getElementById("recommendations-section")
  const productsGrid = document.getElementById("chat-products-grid")

  if (products.length > 0) {
    productsGrid.innerHTML = products
      .map((product, index) => {
        const safeProduct = {
          title: escapeHtml(product.title || "제품명 없음"),
          description: escapeHtml(product.description || "설명이 없습니다."),
          link: product.link || "#",
          keyword: escapeHtml(product.keyword || ""),
          source: escapeHtml(product.source || "알 수 없음"),
          displayedLink: escapeHtml(product.displayedLink || ""),
          isPremium: product.isPremium || false,
        }

        return `
          <div class="product-card ${safeProduct.isPremium ? "premium-product" : ""}" style="animation-delay: ${index * 0.1}s">
            ${safeProduct.isPremium ? '<div class="premium-badge">🏆 프리미엄</div>' : ""}
            <h3 class="product-title">${safeProduct.title}</h3>
            <p class="product-description">${safeProduct.description}</p>
            <div class="product-ingredients">
              <h4>🔍 관련 키워드</h4>
              <p>${safeProduct.keyword}</p>
            </div>
            <div class="product-source">
              <small><strong>🛒 판매처:</strong> ${safeProduct.source}</small><br>
              <small><strong>🌐 도메인:</strong> ${safeProduct.displayedLink}</small><br>
              <small><strong>📅 검색일:</strong> ${new Date().toLocaleDateString("ko-KR")}</small>
            </div>
            <a href="${safeProduct.link}" target="_blank" rel="noopener noreferrer" class="product-link ${safeProduct.isPremium ? "premium-link" : ""}">
              ${safeProduct.isPremium ? "🛒 프리미엄 구매하기 →" : "자세히 보기 →"}
            </a>
          </div>
        `
      })
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

function goHome() {
  window.location.href = "index.html"
}

function escapeHtml(text) {
  if (typeof text !== "string") {
    return String(text || "")
  }

  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}
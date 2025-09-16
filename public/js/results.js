let isAnalyzing = false

document.addEventListener("DOMContentLoaded", () => {
  console.log("Results 페이지 로드됨")

  const navBrand = document.querySelector(".nav-brand")
  if (navBrand) {
    navBrand.addEventListener("click", () => {
      window.location.href = "index.html"
    })
  }

  const mainTab = document.querySelector(".nav-tab")
  if (mainTab && mainTab.textContent.includes("Main")) {
    mainTab.addEventListener("click", () => {
      window.location.href = "index.html"
    })
  }

  const chatTab = document.querySelectorAll(".nav-tab")[1]
  if (chatTab && chatTab.textContent.includes("Chat")) {
    chatTab.addEventListener("click", () => {
      window.location.href = "chat.html"
    })
  }

  const symptoms = localStorage.getItem("symptoms")
  if (symptoms && symptoms.trim().length > 0) {
    console.log("저장된 증상:", symptoms)
    analyzeSymptoms(symptoms)
  } else {
    console.log("증상이 없어서 메인으로 이동")
    window.location.href = "index.html"
  }

  const newSymptomInput = document.getElementById("new-symptom-input")
  if (newSymptomInput) {
    newSymptomInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        analyzeNewSymptoms()
      }
    })
  }
})

async function analyzeSymptoms(symptoms) {
  if (isAnalyzing) {
    console.log("이미 분석 중입니다.")
    return
  }

  isAnalyzing = true
  console.log("증상 분석 시작:", symptoms)

  try {
    showLoading()

    console.log("AI 분석 요청 중...")
    const analysisResult = await analyzeWithGroq(symptoms)
    console.log("AI 분석 완료:", analysisResult)

    console.log("제품 검색 시작...")
    const products = await searchProducts(analysisResult.keywords)
    console.log("제품 검색 완료:", products)

    displayResults(analysisResult, products)
  } catch (error) {
    console.error("분석 중 오류 발생:", error)
    displayError("분석 중 오류가 발생했습니다. 다시 시도해주세요.")
  } finally {
    isAnalyzing = false
  }
}

async function analyzeWithGroq(symptoms) {
  try {
    console.log("Groq API 호출 시작")
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symptoms }),
    })

    console.log("Groq API 응답 상태:", response.status)

    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`)
    }

    const data = await response.json()
    console.log("Groq API 응답 데이터:", data)

    if (!data.success) {
      throw new Error(data.error || "API 응답 오류")
    }

    return {
      fullAnalysis: data.analysis,
      keywords: data.keywords || ["건강보조식품", "영양제", "비타민"],
    }
  } catch (error) {
    console.error("AI 분석 중 오류:", error)

    return {
      fullAnalysis: `
        <strong>증상 분석 결과</strong><br><br>
        입력하신 증상: ${symptoms}<br><br>
        죄송합니다. 현재 AI 분석 서비스에 일시적인 문제가 발생했습니다.<br>
        일반적인 건강 관리를 위해 다음과 같은 방법들을 권장드립니다:<br><br>
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
    console.log("제품 검색 API 호출:", keywords)
    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keywords }),
    })

    console.log("검색 API 응답 상태:", response.status)

    if (!response.ok) {
      throw new Error(`검색 API 호출 실패: ${response.status}`)
    }

    const data = await response.json()
    console.log("검색 API 응답 데이터:", data)

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
  console.log("샘플 제품 생성:", keyword)
  return [
    {
      title: `${keyword} 관련 건강보조식품`,
      description:
        "현재 실시간 검색 결과를 가져올 수 없어 샘플 정보를 표시합니다. 정확한 제품 정보는 직접 검색해보시기 바랍니다.",
      link: `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword + " 건강보조식품")}`,
      keyword: keyword,
      source: "쿠팡",
      displayedLink: "coupang.com",
      isPremium: true,
    },
    {
      title: `${keyword} 영양제 추천`,
      description: "건강한 생활을 위한 영양제를 찾아보세요.",
      link: `https://www.iherb.com/search?kw=${encodeURIComponent(keyword)}`,
      keyword: keyword,
      source: "아이허브",
      displayedLink: "iherb.com",
      isPremium: true,
    },
  ]
}

function showLoading() {
  console.log("로딩 화면 표시")
  const loadingScreen = document.getElementById("loading-screen")
  const resultsContent = document.getElementById("results-content")

  if (loadingScreen) {
    loadingScreen.style.display = "flex"
  }
  if (resultsContent) {
    resultsContent.style.display = "none"
  }
}

function hideLoading() {
  console.log("로딩 화면 숨김")
  const loadingScreen = document.getElementById("loading-screen")
  const resultsContent = document.getElementById("results-content")

  if (loadingScreen) {
    loadingScreen.style.display = "none"
  }
  if (resultsContent) {
    resultsContent.style.display = "block"
  }
}

function displayResults(analysisResult, products) {
  console.log("결과 표시 시작")
  hideLoading()

  const analysisDiv = document.getElementById("analysis-result")
  if (analysisDiv) {
    analysisDiv.innerHTML = `
      <div class="analysis-content">
        <h3>🤖 AI 분석 결과</h3>
        <div class="analysis-text">${analysisResult.fullAnalysis.replace(/\n/g, "<br>")}</div>
        <div class="disclaimer">
          <p><strong>⚠️ 주의사항:</strong> 이는 일반적인 건강 정보이며 의학적 진단이나 치료를 대체할 수 없습니다. 정확한 진단과 치료를 위해서는 반드시 전문의와 상담하시기 바랍니다.</p>
        </div>
      </div>
    `
  }

  const productsGrid = document.getElementById("products-grid")
  if (productsGrid) {
    if (products && products.length > 0) {
      console.log("제품 카드 생성:", products.length, "개")
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
    } else {
      console.log("제품이 없어서 빈 상태 표시")
      productsGrid.innerHTML = `
        <div class="no-products">
          <div class="no-products-icon">🔍</div>
          <h3>제품을 찾을 수 없습니다</h3>
          <p>죄송합니다. 관련 제품을 찾을 수 없습니다.<br>다른 증상으로 다시 검색해보세요.</p>
          <button onclick="focusNewSymptomInput()" class="cta-button">
            새로운 증상 입력하기
          </button>
        </div>
      `
    }
  }

  setTimeout(() => {
    const productCards = document.querySelectorAll(".product-card")
    productCards.forEach((card) => {
      card.classList.add("fade-in")
    })
  }, 100)

  console.log("결과 표시 완료")
}

function displayError(message) {
  console.log("오류 표시:", message)
  hideLoading()

  const analysisDiv = document.getElementById("analysis-result")
  if (analysisDiv) {
    analysisDiv.innerHTML = `
      <div class="error-message">
        <div class="error-icon">⚠️</div>
        <h3>오류 발생</h3>
        <p>${escapeHtml(message)}</p>
        <div class="error-actions">
          <button onclick="retryAnalysis()" class="cta-button">다시 시도</button>
          <button onclick="goHome()" class="cta-button secondary">메인으로 돌아가기</button>
        </div>
      </div>
    `
  }

  const productsGrid = document.getElementById("products-grid")
  if (productsGrid) {
    productsGrid.innerHTML = ""
  }
}

function retryAnalysis() {
  console.log("분석 재시도")
  const symptoms = localStorage.getItem("symptoms")
  if (symptoms) {
    analyzeSymptoms(symptoms)
  } else {
    goHome()
  }
}

function analyzeNewSymptoms() {
  const newSymptomInput = document.getElementById("new-symptom-input")
  if (!newSymptomInput) {
    console.log("새 증상 입력 필드를 찾을 수 없음")
    return
  }

  const symptoms = newSymptomInput.value.trim()

  if (!symptoms) {
    alert("증상을 입력해주세요.")
    newSymptomInput.focus()
    return
  }

  if (symptoms.length < 5) {
    alert("증상을 더 자세히 입력해주세요. (최소 5자 이상)")
    newSymptomInput.focus()
    return
  }

  console.log("새로운 증상으로 분석:", symptoms)

  localStorage.setItem("symptoms", symptoms)
  analyzeSymptoms(symptoms)
  newSymptomInput.value = ""

  const analysisSection = document.querySelector(".analysis-section")
  if (analysisSection) {
    analysisSection.scrollIntoView({
      behavior: "smooth",
    })
  }
}

function focusNewSymptomInput() {
  const newSymptomInput = document.getElementById("new-symptom-input")
  if (newSymptomInput) {
    newSymptomInput.focus()
  }
}

function goHome() {
  console.log("메인 페이지로 이동")
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

window.retryAnalysis = retryAnalysis
window.goHome = goHome
window.analyzeNewSymptoms = analyzeNewSymptoms
window.focusNewSymptomInput = focusNewSymptomInput

window.addEventListener("beforeunload", () => {
  console.log("Results 페이지 언로드")
})

window.addEventListener("error", (e) => {
  console.error("전역 오류 발생:", e.error)
})

window.addEventListener("unhandledrejection", (e) => {
  console.error("처리되지 않은 Promise 거부:", e.reason)
})
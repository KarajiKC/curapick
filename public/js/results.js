document.addEventListener("DOMContentLoaded", () => {
  const navBrand = document.querySelector(".nav-brand")
  if (navBrand) {
    navBrand.addEventListener("click", () => {
      window.location.href = "index.html"
    })
  }

  const symptoms = localStorage.getItem("symptoms")
  if (symptoms) {
    analyzeSymptoms(symptoms)
  } else {
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
  try {
    showLoading()

    const analysisResult = await analyzeWithGroq(symptoms)

    const products = await searchProducts(analysisResult.keywords)

    displayResults(analysisResult, products)
  } catch (error) {
    console.error("분석 중 오류 발생:", error)
    displayError("분석 중 오류가 발생했습니다. 다시 시도해주세요.")
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
      throw new Error(`API 호출 실패: ${response.status}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || "API 응답 오류")
    }

    return {
      fullAnalysis: data.analysis,
      keywords: data.keywords,
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
    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keywords }),
    })

    if (!response.ok) {
      throw new Error(`검색 API 호출 실패: ${response.status}`)
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
      description:
        "현재 실시간 검색 결과를 가져올 수 없어 샘플 정보를 표시합니다. 정확한 제품 정보는 직접 검색해보시기 바랍니다.",
      link: `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword + " 건강보조식품")}`,
      keyword: keyword,
      source: "쿠팡",
    },
  ]
}

function showLoading() {
  document.getElementById("loading-screen").style.display = "flex"
  document.getElementById("results-content").style.display = "none"
}

function hideLoading() {
  document.getElementById("loading-screen").style.display = "none"
  document.getElementById("results-content").style.display = "block"
}

function displayResults(analysisResult, products) {
  hideLoading()

  const analysisDiv = document.getElementById("analysis-result")
  analysisDiv.innerHTML = `
    <div class="analysis-content">
      <h3>🤖 AI 분석 결과</h3>
      <div class="analysis-text">${analysisResult.fullAnalysis.replace(/\n/g, "<br>")}</div>
      <div class="disclaimer">
        <p><strong>⚠️ 주의사항:</strong> 이는 일반적인 건강 정보이며 의학적 진단이나 치료를 대체할 수 없습니다. 정확한 진단과 치료를 위해서는 반드시 전문의와 상담하시기 바랍니다.</p>
      </div>
    </div>
  `

  const productsGrid = document.getElementById("products-grid")
  if (products.length > 0) {
    productsGrid.innerHTML = products
      .map(
        (product, index) => `
        <div class="product-card ${product.isPremium ? "premium-product" : ""}" style="animation-delay: ${index * 0.1}s">
          ${product.isPremium ? '<div class="premium-badge">🏆 프리미엄</div>' : ""}
          <h3 class="product-title">${escapeHtml(product.title)}</h3>
          <p class="product-description">${escapeHtml(product.description)}</p>
          <div class="product-ingredients">
            <h4>🔍 관련 키워드</h4>
            <p>${escapeHtml(product.keyword)}</p>
          </div>
          <div class="product-source">
            <small><strong>🛒 판매처:</strong> ${escapeHtml(product.source)}</small><br>
            <small><strong>🌐 도메인:</strong> ${escapeHtml(product.displayedLink)}</small><br>
            <small><strong>📅 검색일:</strong> ${new Date().toLocaleDateString("ko-KR")}</small>
          </div>
          <a href="${product.link}" target="_blank" rel="noopener noreferrer" class="product-link ${product.isPremium ? "premium-link" : ""}">
            ${product.isPremium ? "🛒 프리미엄 구매하기 →" : "자세히 보기 →"}
          </a>
        </div>
      `,
      )
      .join("")
  } else {
    productsGrid.innerHTML = `
      <div class="no-products">
        <div class="no-products-icon">🔍</div>
        <h3>제품을 찾을 수 없습니다</h3>
        <p>죄송합니다. 관련 제품을 찾을 수 없습니다.<br>다른 증상으로 다시 검색해보세요.</p>
        <button onclick="document.getElementById('new-symptom-input').focus()" class="cta-button">
          새로운 증상 입력하기
        </button>
      </div>
    `
  }

  setTimeout(() => {
    document.querySelectorAll(".product-card").forEach((card) => {
      card.classList.add("fade-in")
    })
  }, 100)
}

function displayError(message) {
  hideLoading()

  document.getElementById("analysis-result").innerHTML = `
    <div class="error-message">
      <div class="error-icon">⚠️</div>
      <h3>오류 발생</h3>
      <p>${message}</p>
      <div class="error-actions">
        <button onclick="retryAnalysis()" class="cta-button">다시 시도</button>
        <button onclick="goHome()" class="cta-button secondary">메인으로 돌아가기</button>
      </div>
    </div>
  `

  document.getElementById("products-grid").innerHTML = ""
}

function retryAnalysis() {
  const symptoms = localStorage.getItem("symptoms")
  if (symptoms) {
    analyzeSymptoms(symptoms)
  } else {
    goHome()
  }
}

function analyzeNewSymptoms() {
  const newSymptomInput = document.getElementById("new-symptom-input")
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

  localStorage.setItem("symptoms", symptoms)
  analyzeSymptoms(symptoms)
  newSymptomInput.value = ""

  document.querySelector(".analysis-section").scrollIntoView({
    behavior: "smooth",
  })
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

window.addEventListener("beforeunload", () => {
})
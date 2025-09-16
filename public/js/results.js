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

    const analysisResult = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptoms }),
    }).then((res) => res.json())

    const products = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: analysisResult.keywords }),
    }).then((res) => res.json())

    displayResults(analysisResult, products.products || [])
  } catch (error) {
    console.error("분석 오류:", error)
    displayError("분석 중 오류가 발생했습니다.")
  }
}

function showLoading() {
  const loadingScreen = document.getElementById("loading-screen")
  const resultsContent = document.getElementById("results-content")
  if (loadingScreen) loadingScreen.style.display = "flex"
  if (resultsContent) resultsContent.style.display = "none"
}

function hideLoading() {
  const loadingScreen = document.getElementById("loading-screen")
  const resultsContent = document.getElementById("results-content")
  if (loadingScreen) loadingScreen.style.display = "none"
  if (resultsContent) resultsContent.style.display = "block"
}

function displayResults(analysisResult, products) {
  hideLoading()

  const analysisDiv = document.getElementById("analysis-result")
  if (analysisDiv) {
    analysisDiv.innerHTML = `
      <div class="analysis-content">
        <h3>큐라픽 분석 결과</h3>
        <div class="analysis-text">${analysisResult.fullAnalysis.replace(/\n/g, "<br>")}</div>
        <div class="disclaimer">
          <p><strong>Tip:</strong> 이는 일반적인 건강 정보이며 의학적 진단이나 치료를 대체할 수 없습니다.</p>
        </div>
      </div>
    `
  }

  const productsGrid = document.getElementById("products-grid")
  if (productsGrid) {
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
            <small><strong>검색일:</strong> ${new Date().toLocaleDateString("ko-KR")}</small>
          </div>
          <a href="${product.link}" target="_blank" rel="noopener noreferrer" class="product-link">
            자세히 보기 →
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
          <p>다른 증상으로 다시 검색해보세요.</p>
        </div>
      `
    }
  }
}

function displayError(message) {
  hideLoading()
  const analysisDiv = document.getElementById("analysis-result")
  if (analysisDiv) {
    analysisDiv.innerHTML = `
      <div class="error-message">
        <div class="error-icon">⚠️</div>
        <h3>오류 발생</h3>
        <p>${message}</p>
        <button onclick="retryAnalysis()" class="cta-button">다시 시도</button>
      </div>
    `
  }
}

function retryAnalysis() {
  const symptoms = localStorage.getItem("symptoms")
  if (symptoms) analyzeSymptoms(symptoms)
  else goHome()
}

function analyzeNewSymptoms() {
  const newSymptomInput = document.getElementById("new-symptom-input")
  const symptoms = newSymptomInput.value.trim()

  if (!symptoms) {
    alert("증상을 입력해주세요.")
    return
  }

  if (symptoms.length < 5) {
    alert("증상을 더 자세히 입력해주세요.")
    return
  }

  localStorage.setItem("symptoms", symptoms)
  analyzeSymptoms(symptoms)
  newSymptomInput.value = ""
}

function escapeHtml(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

function goHome() {
  window.location.href = "index.html"
}
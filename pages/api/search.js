export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    res.status(200).end()
    return
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "허용되지 않은 메소드입니다" })
  }

  const { keywords } = req.body

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: "검색 키워드가 필요합니다." })
  }

  const SERPER_API_KEY = process.env.SERPER_API_KEY

  if (!SERPER_API_KEY) {
    return res.status(200).json({
      success: true,
      products: [
        {
          title: `${keywords[0]} 관련 건강보조식품`,
          description: "현재 실시간 검색 결과를 가져올 수 없어 샘플 정보를 표시합니다.",
          link: `https://www.coupang.com/np/search?q=${encodeURIComponent(keywords[0] + " 건강보조식품")}`,
          keyword: keywords[0],
          source: "쿠팡",
        },
      ],
      total: 1,
      keywords: keywords,
    })
  }

  const premiumSites = [
    "coupang.com",
    "iherb.com",
    "oliveyoung.co.kr",
    "gmarket.co.kr",
    "ssg.com",
    "lotteon.com",
    "11st.co.kr",
    "auction.co.kr",
    "wemakeprice.com",
    "gsshop.com",
    "hmall.com",
  ]

  const blockedSites = [
    "tiktok.com",
    "blog.naver.com",
    "youtube.com",
    "instagram.com",
    "facebook.com",
    "twitter.com",
    "cafe.naver.com",
    "tistory.com",
    "brunch.co.kr",
    "dcinside.com",
    "fmkorea.com",
    "reddit.com",
    "namu.wiki",
  ]

  const reviewKeywords = ["리뷰", "후기", "체험", "사용기", "솔직", "추천", "비교", "분석", "평가"]

  const products = []
  const maxProductsPerKeyword = 10
  const maxTotalProducts = 8

  try {
    for (let i = 0; i < Math.min(keywords.length, 3); i++) {
      const keyword = keywords[i]

      const premiumSiteQuery = premiumSites
        .slice(0, 6)
        .map((site) => `site:${site}`)
        .join(" OR ")
      const searchQuery = `(${premiumSiteQuery}) "${keyword}" 건강보조식품 영양제 구매 할인 -리뷰 -후기 -체험 -사용기`

      try {
        console.log(`🔍 검색: ${keyword}`)

        const response = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: searchQuery,
            num: maxProductsPerKeyword,
            gl: "kr",
            hl: "ko",
            type: "search",
          }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log(`✅ ${keyword}: ${data.organic?.length || 0}개 결과`)

          if (data.organic && Array.isArray(data.organic)) {
            const filteredResults = data.organic
              .filter((result) => {
                const url = result.link.toLowerCase()
                return !blockedSites.some((blocked) => url.includes(blocked))
              })
              .filter((result) => {
                const title = (result.title || "").toLowerCase()
                const snippet = (result.snippet || "").toLowerCase()
                return !reviewKeywords.some((review) => title.includes(review) || snippet.includes(review))
              })
              .sort((a, b) => {
                const purchaseKeywords = ["구매", "할인", "특가", "세일", "가격", "최저가", "쿠폰"]
                const aScore = purchaseKeywords.reduce((score, word) => {
                  return score + (a.title?.includes(word) ? 2 : 0) + (a.snippet?.includes(word) ? 1 : 0)
                }, 0)
                const bScore = purchaseKeywords.reduce((score, word) => {
                  return score + (b.title?.includes(word) ? 2 : 0) + (b.snippet?.includes(word) ? 1 : 0)
                }, 0)
                return bScore - aScore
              })
              .sort((a, b) => {
                const aIsPremium = premiumSites.some((site) => a.link.toLowerCase().includes(site))
                const bIsPremium = premiumSites.some((site) => b.link.toLowerCase().includes(site))
                if (aIsPremium && !bIsPremium) return -1
                if (!aIsPremium && bIsPremium) return 1
                return 0
              })

            filteredResults.slice(0, 3).forEach((result, index) => {
              if (products.length < maxTotalProducts) {
                try {
                  const url = new URL(result.link)

                  const cleanTitle = (result.title || `${keyword} 관련 제품`)
                    .replace(/\[리뷰\]|\[후기\]|\[체험\]|\[광고\]|\[추천\]/g, "")
                    .replace(/\s+/g, " ")
                    .trim()

                  const cleanDescription = (result.snippet || "제품 설명이 없습니다.")
                    .replace(/리뷰|후기|체험기|사용기/g, "")
                    .trim()

                  products.push({
                    title: cleanTitle,
                    description: cleanDescription,
                    link: result.link,
                    keyword: keyword,
                    source: result.source || url.hostname,
                    displayedLink: url.hostname,
                    position: result.position || index + 1,
                    isPremium: premiumSites.some((site) => result.link.toLowerCase().includes(site)),
                    quality: "premium",
                  })
                } catch (urlError) {
                  console.error("URL 파싱 오류:", urlError)
                }
              }
            })
          }
        } else {
          console.warn(`❌ ${keyword} 검색 실패: ${response.status}`)
        }
      } catch (searchError) {
        console.error(`❌ ${keyword} 검색 오류:`, searchError)
      }

      if (i < Math.min(keywords.length, 3) - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800))
      }
    }

    const uniqueProducts = products.filter((product, index, self) => {
      const titleWords = product.title
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
      return (
        index ===
        self.findIndex((p) => {
          const pTitleWords = p.title
            .toLowerCase()
            .replace(/[^\w\s]/g, "")
            .split(/\s+/)
          const commonWords = titleWords.filter((word) => pTitleWords.includes(word))
          return commonWords.length >= Math.min(titleWords.length, pTitleWords.length) * 0.7 || p.link === product.link
        })
      )
    })

    const finalProducts = uniqueProducts
      .sort((a, b) => {
        if (a.isPremium && !b.isPremium) return -1
        if (!a.isPremium && b.isPremium) return 1
        const aPurchase = ["구매", "할인", "특가"].some((word) => a.title.includes(word))
        const bPurchase = ["구매", "할인", "특가"].some((word) => b.title.includes(word))
        if (aPurchase && !bPurchase) return -1
        if (!aPurchase && bPurchase) return 1
        return 0
      })
      .slice(0, maxTotalProducts)

    console.log(`🎉 최종 ${finalProducts.length}개 고품질 제품 선별`)

    return res.status(200).json({
      success: true,
      products: finalProducts,
      total: finalProducts.length,
      keywords: keywords,
      quality: "premium_filtered",
    })
  } catch (error) {
    console.error("❌ 검색 API 전체 오류:", error)
    return res.status(500).json({
      error: "제품 검색 중 오류가 발생했습니다.",
      details: error.message,
    })
  }
}
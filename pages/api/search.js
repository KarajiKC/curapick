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
      products: getSampleProducts(keywords),
      total: 3,
      keywords: keywords,
    })
  }

  const targetSites = [
    "coupang.com",
    "gmarket.co.kr",
    "11st.co.kr",
    "auction.co.kr",
    "lotteon.com",
    "ssg.com",
    "wemakeprice.com",
    "tmon.co.kr",

    "oliveyoung.co.kr",
    "gsshop.com",
    "hmall.com",
    "lotteimall.com",

    "iherb.com",
    "vitacost.com",
    "swansonvitamins.com",

    "pharmcle.com",
    "yaksamo.com",
    "pillyze.com",
  ]

  const blockedSites = [
    "blog.naver.com",
    "cafe.naver.com",
    "tistory.com",
    "brunch.co.kr",
    "youtube.com",
    "instagram.com",
    "facebook.com",
    "twitter.com",
    "dcinside.com",
    "fmkorea.com",
    "reddit.com",
    "namu.wiki",
    "tiktok.com",
  ]

  const reviewKeywords = ["리뷰", "후기", "체험", "사용기", "솔직", "추천글", "비교", "분석", "평가", "테스트"]

  const products = []
  const minProducts = 3
  const maxProductsPerKeyword = 15
  const maxTotalProducts = 8

  try {
    for (let strategy = 1; strategy <= 3 && products.length < minProducts; strategy++) {
      console.log(`🔍 검색 전략 ${strategy} 시작`)

      for (let i = 0; i < Math.min(keywords.length, 3) && products.length < maxTotalProducts; i++) {
        const keyword = keywords[i]
        let searchQuery = ""

        switch (strategy) {
          case 1:
            const sitesQuery = targetSites
              .slice(0, 8)
              .map((site) => `site:${site}`)
              .join(" OR ")
            searchQuery = `(${sitesQuery}) "${keyword}" 건강보조식품 영양제 구매 -리뷰 -후기 -체험`
            break

          case 2:
            searchQuery = `"${keyword}" 건강보조식품 영양제 구매 할인 특가 온라인 쇼핑몰 -리뷰 -후기 -블로그`
            break

          case 3:
            searchQuery = `"${keyword}" 영양제 건강식품 보조식품 구매 -리뷰 -후기 -체험기 -사용기`
            break
        }

        try {
          console.log(`🔍 검색 중: ${keyword} (전략 ${strategy})`)

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
            console.log(`✅ ${keyword}: ${data.organic?.length || 0}개 결과 (전략 ${strategy})`)

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
                  const aIndex = targetSites.findIndex((site) => a.link.toLowerCase().includes(site))
                  const bIndex = targetSites.findIndex((site) => b.link.toLowerCase().includes(site))

                  if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
                  if (aIndex !== -1 && bIndex === -1) return -1
                  if (aIndex === -1 && bIndex !== -1) return 1
                  return 0
                })
                .sort((a, b) => {
                  const purchaseKeywords = ["구매", "할인", "특가", "세일", "가격", "최저가", "쿠폰", "무료배송"]
                  const aScore = purchaseKeywords.reduce((score, word) => {
                    return score + (a.title?.includes(word) ? 2 : 0) + (a.snippet?.includes(word) ? 1 : 0)
                  }, 0)
                  const bScore = purchaseKeywords.reduce((score, word) => {
                    return score + (b.title?.includes(word) ? 2 : 0) + (b.snippet?.includes(word) ? 1 : 0)
                  }, 0)
                  return bScore - aScore
                })

              filteredResults.slice(0, 5).forEach((result, index) => {
                if (products.length < maxTotalProducts) {
                  try {
                    const url = new URL(result.link)
                    const hostname = url.hostname.toLowerCase()

                    const isDuplicate = products.some((p) => {
                      const pUrl = new URL(p.link)
                      return pUrl.hostname === hostname && p.title.toLowerCase().includes(keyword.toLowerCase())
                    })

                    if (!isDuplicate) {
                      const cleanTitle = (result.title || `${keyword} 관련 제품`)
                        .replace(/\[리뷰\]|\[후기\]|\[체험\]|\[광고\]|\[추천\]/g, "")
                        .replace(/\s+/g, " ")
                        .trim()

                      const cleanDescription = (result.snippet || "제품 설명이 없습니다.")
                        .replace(/리뷰|후기|체험기|사용기/g, "")
                        .trim()

                      const isTargetSite = targetSites.some((site) => hostname.includes(site))
                      const siteIndex = targetSites.findIndex((site) => hostname.includes(site))

                      products.push({
                        title: cleanTitle,
                        description: cleanDescription,
                        link: result.link,
                        keyword: keyword,
                        source: result.source || hostname,
                        displayedLink: hostname,
                        position: result.position || index + 1,
                        isTargetSite: isTargetSite,
                        sitePriority: siteIndex !== -1 ? siteIndex : 999,
                        strategy: strategy,
                        quality: isTargetSite ? "premium" : "standard",
                      })

                      console.log(`✅ 제품 추가: ${cleanTitle.substring(0, 30)}... (${hostname})`)
                    }
                  } catch (urlError) {
                    console.error("URL 파싱 오류:", urlError)
                  }
                }
              })
            }
          } else {
            console.warn(`❌ ${keyword} 검색 실패: ${response.status} (전략 ${strategy})`)
          }
        } catch (searchError) {
          console.error(`❌ ${keyword} 검색 오류 (전략 ${strategy}):`, searchError)
        }

        if (i < Math.min(keywords.length, 3) - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      console.log(`📊 전략 ${strategy} 완료: 총 ${products.length}개 제품`)

      if (strategy < 3 && products.length < minProducts) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    const finalProducts = products
      .filter((product, index, self) => {
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
            return (
              commonWords.length >= Math.min(titleWords.length, pTitleWords.length) * 0.6 || p.link === product.link
            )
          })
        )
      })
      .sort((a, b) => {
        if (a.sitePriority !== b.sitePriority) return a.sitePriority - b.sitePriority
        if (a.isTargetSite && !b.isTargetSite) return -1
        if (!a.isTargetSite && b.isTargetSite) return 1
        return a.strategy - b.strategy
      })
      .slice(0, maxTotalProducts)

    if (finalProducts.length < minProducts) {
      console.log(`⚠️ 제품 수 부족 (${finalProducts.length}/${minProducts}), 샘플 제품 추가`)
      const sampleProducts = getSampleProducts(keywords)
      const neededCount = minProducts - finalProducts.length
      finalProducts.push(...sampleProducts.slice(0, neededCount))
    }

    console.log(`🎉 최종 ${finalProducts.length}개 제품 선별`)

    return res.status(200).json({
      success: true,
      products: finalProducts,
      total: finalProducts.length,
      keywords: keywords,
      quality: "multi_strategy_filtered",
      strategies_used: Math.min(3, Math.ceil(finalProducts.length / 2)),
    })
  } catch (error) {
    console.error("❌ 검색 API 전체 오류:", error)

    const sampleProducts = getSampleProducts(keywords)
    return res.status(200).json({
      success: true,
      products: sampleProducts,
      total: sampleProducts.length,
      keywords: keywords,
      quality: "fallback_samples",
      error: "검색 중 오류가 발생하여 샘플 제품을 표시합니다.",
    })
  }
}

function getSampleProducts(keywords) {
  const keyword = keywords[0] || "건강보조식품"

  return [
    {
      title: `${keyword} 프리미엄 건강보조식품`,
      description:
        "고품질 원료로 만든 프리미엄 건강보조식품입니다. 현재 실시간 검색 결과를 가져올 수 없어 샘플 정보를 표시합니다.",
      link: `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword + " 건강보조식품")}`,
      keyword: keyword,
      source: "쿠팡",
      displayedLink: "coupang.com",
      isTargetSite: true,
      quality: "sample",
    },
    {
      title: `${keyword} 영양제 추천 상품`,
      description: "건강한 생활을 위한 필수 영양제를 만나보세요.",
      link: `https://www.gmarket.co.kr/n/search?keyword=${encodeURIComponent(keyword + " 영양제")}`,
      keyword: keyword,
      source: "지마켓",
      displayedLink: "gmarket.co.kr",
      isTargetSite: true,
      quality: "sample",
    },
    {
      title: `${keyword} 건강식품 베스트`,
      description: "검증된 품질의 건강식품으로 건강을 지키세요.",
      link: `https://www.11st.co.kr/products/search?kwd=${encodeURIComponent(keyword + " 건강식품")}`,
      keyword: keyword,
      source: "11번가",
      displayedLink: "11st.co.kr",
      isTargetSite: true,
      quality: "sample",
    },
  ]
}
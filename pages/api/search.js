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
      total: 5,
      keywords: keywords,
    })
  }

  const prioritySites = ["wsmon.co.kr", "iherb.com"]
  const targetSites = [
    "wsmon.co.kr",
    "iherb.com",
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
  const targetProducts = 6
  const maxTotalProducts = 10
  const maxProductsPerSearch = 20

  try {
    console.log(`🎯 검색 시작: 최소 ${minProducts}개, 목표 ${targetProducts}개 제품`)

    for (const prioritySite of prioritySites) {
      if (products.length >= maxTotalProducts) break

      for (let i = 0; i < Math.min(keywords.length, 2); i++) {
        const keyword = keywords[i]

        try {
          console.log(`🔥 최우선 검색: ${keyword} @ ${prioritySite}`)

          const searchQuery = `site:${prioritySite} "${keyword}" 건강보조식품 영양제 보조식품 건강식품 -리뷰 -후기`

          const response = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
              "X-API-KEY": SERPER_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              q: searchQuery,
              num: maxProductsPerSearch,
              gl: "kr",
              hl: "ko",
              type: "search",
            }),
          })

          if (response.ok) {
            const data = await response.json()
            console.log(`✅ ${prioritySite}: ${data.organic?.length || 0}개 결과`)

            if (data.organic && Array.isArray(data.organic)) {
              const filteredResults = data.organic
                .filter((result) => {
                  const url = result.link.toLowerCase()
                  const title = (result.title || "").toLowerCase()
                  const snippet = (result.snippet || "").toLowerCase()

                  return (
                    !blockedSites.some((blocked) => url.includes(blocked)) &&
                    !reviewKeywords.some((review) => title.includes(review) || snippet.includes(review))
                  )
                })
                .slice(0, 3)

              filteredResults.forEach((result, index) => {
                if (products.length < maxTotalProducts) {
                  try {
                    const url = new URL(result.link)
                    const hostname = url.hostname.toLowerCase()

                    const isDuplicate = products.some((p) => {
                      return (
                        p.link === result.link ||
                        p.title.toLowerCase().includes(result.title.toLowerCase().substring(0, 20))
                      )
                    })

                    if (!isDuplicate) {
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
                        source: result.source || hostname,
                        displayedLink: hostname,
                        position: result.position || index + 1,
                        isPriority: true,
                        sitePriority: prioritySites.indexOf(prioritySite),
                        quality: "priority",
                      })

                      console.log(`🔥 우선 제품 추가: ${cleanTitle.substring(0, 30)}... (${hostname})`)
                    }
                  } catch (urlError) {
                    console.error("URL 파싱 오류:", urlError)
                  }
                }
              })
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 800))
        } catch (error) {
          console.error(`❌ ${prioritySite} 검색 오류:`, error)
        }
      }
    }

    console.log(`🔥 1단계 완료: ${products.length}개 우선 제품 확보`)

    if (products.length < targetProducts) {
      const remainingSites = targetSites.filter((site) => !prioritySites.includes(site))

      for (let strategy = 1; strategy <= 2 && products.length < targetProducts; strategy++) {
        for (let i = 0; i < Math.min(keywords.length, 3) && products.length < maxTotalProducts; i++) {
          const keyword = keywords[i]
          let searchQuery = ""

          switch (strategy) {
            case 1:
              const sitesQuery = remainingSites
                .slice(0, 6)
                .map((site) => `site:${site}`)
                .join(" OR ")
              searchQuery = `(${sitesQuery}) "${keyword}" 건강보조식품 영양제 -리뷰 -후기`
              break

            case 2:
              searchQuery = `"${keyword}" 건강보조식품 영양제 구매 온라인 -리뷰 -후기 -블로그 -체험`
              break
          }

          try {
            console.log(`🎯 일반 검색: ${keyword} (전략 ${strategy})`)

            const response = await fetch("https://google.serper.dev/search", {
              method: "POST",
              headers: {
                "X-API-KEY": SERPER_API_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                q: searchQuery,
                num: maxProductsPerSearch,
                gl: "kr",
                hl: "ko",
                type: "search",
              }),
            })

            if (response.ok) {
              const data = await response.json()
              console.log(`✅ 일반 검색: ${data.organic?.length || 0}개 결과 (전략 ${strategy})`)

              if (data.organic && Array.isArray(data.organic)) {
                const filteredResults = data.organic
                  .filter((result) => {
                    const url = result.link.toLowerCase()
                    const title = (result.title || "").toLowerCase()
                    const snippet = (result.snippet || "").toLowerCase()

                    return (
                      !blockedSites.some((blocked) => url.includes(blocked)) &&
                      !reviewKeywords.some((review) => title.includes(review) || snippet.includes(review))
                    )
                  })
                  .sort((a, b) => {
                    const aIndex = targetSites.findIndex((site) => a.link.toLowerCase().includes(site))
                    const bIndex = targetSites.findIndex((site) => b.link.toLowerCase().includes(site))

                    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
                    if (aIndex !== -1 && bIndex === -1) return -1
                    if (aIndex === -1 && bIndex !== -1) return 1
                    return 0
                  })
                  .slice(0, 4)

                filteredResults.forEach((result, index) => {
                  if (products.length < maxTotalProducts) {
                    try {
                      const url = new URL(result.link)
                      const hostname = url.hostname.toLowerCase()

                      const isDuplicate = products.some((p) => {
                        const pUrl = new URL(p.link)
                        return (
                          pUrl.hostname === hostname ||
                          p.link === result.link ||
                          (p.title.toLowerCase().includes(keyword.toLowerCase()) &&
                            result.title.toLowerCase().includes(keyword.toLowerCase()) &&
                            p.title.substring(0, 30).toLowerCase() === result.title.substring(0, 30).toLowerCase())
                        )
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
                          isPriority: false,
                          sitePriority: siteIndex !== -1 ? siteIndex : 999,
                          strategy: strategy,
                          quality: isTargetSite ? "target" : "standard",
                        })

                        console.log(`✅ 일반 제품 추가: ${cleanTitle.substring(0, 30)}... (${hostname})`)
                      }
                    } catch (urlError) {
                      console.error("URL 파싱 오류:", urlError)
                    }
                  }
                })
              }
            }

            await new Promise((resolve) => setTimeout(resolve, 600))
          } catch (error) {
            console.error(`❌ 일반 검색 오류 (전략 ${strategy}):`, error)
          }
        }

        console.log(`🎯 전략 ${strategy} 완료: 총 ${products.length}개 제품`)
      }
    }

    const finalProducts = products
      .filter((product, index, self) => {
        return index === self.findIndex((p) => p.link === product.link)
      })
      .sort((a, b) => {
        if (a.isPriority && !b.isPriority) return -1
        if (!a.isPriority && b.isPriority) return 1

        if (a.sitePriority !== b.sitePriority) return a.sitePriority - b.sitePriority

        const qualityOrder = { priority: 0, target: 1, standard: 2 }
        return (qualityOrder[a.quality] || 3) - (qualityOrder[b.quality] || 3)
      })
      .slice(0, maxTotalProducts)

    if (finalProducts.length < minProducts) {
      console.log(`⚠️ 제품 수 부족 (${finalProducts.length}/${minProducts}), 샘플 제품 추가`)
      const sampleProducts = getSampleProducts(keywords)
      const neededCount = minProducts - finalProducts.length
      finalProducts.push(...sampleProducts.slice(0, neededCount))
    }

    console.log(
      `🎉 최종 ${finalProducts.length}개 제품 선별 (우선사이트: ${finalProducts.filter((p) => p.isPriority).length}개)`,
    )

    return res.status(200).json({
      success: true,
      products: finalProducts,
      total: finalProducts.length,
      keywords: keywords,
      quality: "priority_enhanced",
      prioritySites: finalProducts.filter((p) => p.isPriority).length,
      targetSites: finalProducts.filter((p) => p.quality === "target").length,
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
      title: `${keyword} 프리미엄 건강보조식품 - 위셀몬`,
      description:
        "위셀몬에서 제공하는 고품질 건강보조식품입니다. 현재 실시간 검색 결과를 가져올 수 없어 샘플 정보를 표시합니다.",
      link: `https://www.wsmon.co.kr/search?q=${encodeURIComponent(keyword)}`,
      keyword: keyword,
      source: "위셀몬",
      displayedLink: "wsmon.co.kr",
      isPriority: true,
      quality: "priority",
    },
    {
      title: `${keyword} Natural Supplement - iHerb`,
      description: "아이허브에서 제공하는 천연 건강보조식품을 만나보세요.",
      link: `https://www.iherb.com/search?kw=${encodeURIComponent(keyword)}`,
      keyword: keyword,
      source: "아이허브",
      displayedLink: "iherb.com",
      isPriority: true,
      quality: "priority",
    },
    {
      title: `${keyword} 건강보조식품`,
      description: "검증된 품질의 건강보조식품으로 건강을 지키세요.",
      link: `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword + " 건강보조식품")}`,
      keyword: keyword,
      source: "쿠팡",
      displayedLink: "coupang.com",
      isPriority: false,
      quality: "target",
    },
    {
      title: `${keyword} 영양제 추천`,
      description: "건강한 생활을 위한 필수 영양제를 찾아보세요.",
      link: `https://www.gmarket.co.kr/n/search?keyword=${encodeURIComponent(keyword + " 영양제")}`,
      keyword: keyword,
      source: "지마켓",
      displayedLink: "gmarket.co.kr",
      isPriority: false,
      quality: "target",
    },
    {
      title: `${keyword} 건강식품 베스트`,
      description: "11번가에서 만나는 프리미엄 건강식품입니다.",
      link: `https://www.11st.co.kr/products/search?kwd=${encodeURIComponent(keyword + " 건강식품")}`,
      keyword: keyword,
      source: "11번가",
      displayedLink: "11st.co.kr",
      isPriority: false,
      quality: "target",
    },
  ]
}
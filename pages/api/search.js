export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "허용되지 않은 메소드입니다" });
  }

  const { keywords } = req.body;

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: "검색 키워드가 필요합니다." });
  }

  const SERPER_API_KEY = process.env.SERPER_API_KEY;

  if (!SERPER_API_KEY || SERPER_API_KEY === "demo_mode") {
    const sampleProducts = keywords.slice(0, 3).map((keyword, index) => ({
      title: `${keyword} 관련 건강보조식품 ${index + 1}`,
      description: `${keyword}에 도움이 될 수 있는 건강보조식품입니다. 현재 실시간 검색 결과를 가져올 수 없어 샘플 정보를 표시합니다. 정확한 제품 정보는 직접 검색해보시기 바랍니다.`,
      link: `https://www.google.com/search?q=${encodeURIComponent(keyword + " 건강보조식품 구매")}`,
      keyword: keyword,
      source: "검색 추천",
      displayedLink: `google.com/search?q=${keyword}`
    }));

    return res.status(200).json({ products: sampleProducts });
  }

  const products = [];
  const maxProductsPerKeyword = 2;
  const maxTotalProducts = 6;

  try {
    for (let i = 0; i < Math.min(keywords.length, 3); i++) {
      const keyword = keywords[i];
      const searchQuery = `${keyword} 건강보조식품 영양제 구매 추천 -광고`;

      try {
        console.log(`검색 중: ${searchQuery}`);
        
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
            type: "search"
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`${keyword} 검색 결과:`, data.organic?.length || 0, '개');
          
          if (data.organic && Array.isArray(data.organic)) {
            data.organic.forEach((result, index) => {
              if (products.length < maxTotalProducts) {
                try {
                  const url = new URL(result.link);
                  products.push({
                    title: result.title || `${keyword} 관련 제품`,
                    description: result.snippet || "제품 설명이 없습니다.",
                    link: result.link,
                    keyword: keyword,
                    source: result.source || url.hostname,
                    displayedLink: result.displayedLink || url.hostname,
                    position: result.position || index + 1
                  });
                } catch (urlError) {
                  console.warn('URL 파싱 오류:', urlError);
                  products.push({
                    title: result.title || `${keyword} 관련 제품`,
                    description: result.snippet || "제품 설명이 없습니다.",
                    link: result.link || `https://www.google.com/search?q=${encodeURIComponent(keyword)}`,
                    keyword: keyword,
                    source: result.source || "검색 결과",
                    displayedLink: result.displayedLink || "검색 결과",
                    position: result.position || index + 1
                  });
                }
              }
            });
          }
        } else {
          console.warn(`${keyword} 검색 실패: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          console.warn('응답 내용:', errorText);
        }
      } catch (searchError) {
        console.error(`${keyword} 검색 중 오류:`, searchError);
      }

      if (i < Math.min(keywords.length, 3) - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const uniqueProducts = products.filter((product, index, self) => 
      index === self.findIndex((p) => 
        p.title.toLowerCase() === product.title.toLowerCase() || 
        p.link === product.link
      )
    );

    console.log(`총 ${uniqueProducts.length}개 제품 찾음`);

    if (uniqueProducts.length === 0) {
      const fallbackProducts = keywords.slice(0, 3).map((keyword, index) => ({
        title: `${keyword} 건강보조식품 추천`,
        description: `${keyword}와 관련된 건강보조식품을 찾고 계신가요? 검색 결과를 가져오는데 문제가 발생했습니다. 아래 링크를 통해 직접 검색해보세요.`,
        link: `https://www.google.com/search?q=${encodeURIComponent(keyword + " 건강보조식품 구매 추천")}`,
        keyword: keyword,
        source: "Google 검색",
        displayedLink: "google.com",
        position: index + 1
      }));

      return res.status(200).json({ 
        products: fallbackProducts,
        message: "실시간 검색 결과를 가져올 수 없어 추천 검색 링크를 제공합니다."
      });
    }

    const finalProducts = uniqueProducts.slice(0, maxTotalProducts);
    
    res.status(200).json({
      products: finalProducts,
      total: finalProducts.length,
      keywords: keywords.slice(0, 3)
    });

  } catch (error) {
    console.error("제품 검색 중 전체 오류:", error);

    const emergencyProducts = keywords.slice(0, 3).map((keyword, index) => ({
      title: `${keyword} 직접 검색하기`,
      description: `검색 서비스에 일시적인 문제가 발생했습니다. ${keyword}와 관련된 건강보조식품을 직접 검색해보세요.`,
      link: `https://www.google.com/search?q=${encodeURIComponent(keyword + " 건강보조식품 영양제 구매")}`,
      keyword: keyword,
      source: "Google 검색",
      displayedLink: "google.com",
      position: index + 1
    }));

    res.status(200).json({
      products: emergencyProducts,
      error: "검색 중 오류가 발생했지만 대체 검색 링크를 제공합니다.",
      fallback: true
    });
  }
}
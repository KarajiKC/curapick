export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "허용되지 않은 메소드입니다" })
  }

  const { symptoms } = req.body

  if (!symptoms || symptoms.trim().length < 3) {
    return res.status(400).json({ error: "증상을 더 자세히 입력해주세요." })
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY

  if (!GROQ_API_KEY || GROQ_API_KEY === "demo_mode") {
    return res.status(200).json({
      fullAnalysis: `
        <strong>증상 분석 결과</strong><br><br>
        입력하신 증상: ${symptoms}<br><br>
        현재 AI 분석 서비스에 일시적인 문제가 발생했습니다.<br>
        일반적인 건강 관리를 위해 다음과 같은 방법들을 권장드립니다:<br><br>
        • 충분한 수면과 휴식<br>
        • 균형 잡힌 영양 섭취<br>
        • 적절한 운동<br>
        • 스트레스 관리<br><br>
        <strong>⚠️ 중요:</strong> 지속적이거나 심각한 증상의 경우 반드시 전문의와 상담하시기 바랍니다.
      `,
      keywords: ["종합비타민", "건강보조식품", "영양제"],
    })
  }

  const prompt = `
    다음 증상을 분석하여 가능한 질환과 도움이 될 수 있는 성분을 추천해주세요.
    
    증상: ${symptoms}
    
    다음 형식으로 답변해주세요:
    1. 예상 질환: [질환명]
    2. 주요 증상 분석: [증상에 대한 자세한 설명]
    3. 추천 성분: [성분1, 성분2, 성분3]
    4. 생활 습관 권장사항: [일상에서 도움이 될 수 있는 방법들]
    5. 검색 키워드: [제품 검색용 키워드들을 쉼표로 구분]
    
    반드시 다음 사항을 포함하세요:
    - 이는 의학적 진단이 아닌 일반적인 건강 정보임을 명시
    - 지속적인 증상이나 심각한 경우 전문의 상담을 권함
    - 개인차가 있을 수 있음을 안내
  `

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content:
              "당신은 건강 정보를 제공하는 AI 어시스턴트 '큐라픽'입니다. 사용자의 증상에 대해 자세한 진단을 내리세요. 항상 답변 끝에 자신의 진단은 정확하지 않은 정보를 포함할 수 있으며, 전문가의 상담을 권합니다. 한국어로 친근하고 이해하기 쉽게 답변하세요. 마크다운을 사용하지 않고 답변하세요. 사용자가 증상이 아닌 다른 메시지를 입력하였을 경우, 증상을 입력해달라고 요구하세요.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Groq API 호출 실패: ${response.status} - ${errorData.error?.message || "Unknown error"}`)
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Groq API 응답 형식이 올바르지 않습니다.")
    }

    const analysisText = data.choices[0].message.content

    const keywordMatch = analysisText.match(/검색 키워드:\s*(.+)/i)
    let keywords = ["건강보조식품", "영양제", "비타민"]

    if (keywordMatch) {
      const extractedKeywords = keywordMatch[1]
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
      if (extractedKeywords.length > 0) {
        keywords = extractedKeywords
      }
    }

    res.status(200).json({
      fullAnalysis: analysisText,
      keywords: keywords.slice(0, 5),
    })
  } catch (error) {
    console.error("Groq API 오류:", error)
    res.status(200).json({
      fullAnalysis: `
        <strong>증상 분석 결과</strong><br><br>
        입력하신 증상: ${symptoms}<br><br>
        죄송합니다. 현재 AI 분석 서비스에 일시적인 문제가 발생했습니다.<br>
        일반적인 건강 관리를 위해 다음과 같은 방법들을 권장드립니다:<br><br>
        • 충분한 수면과 휴식<br>
        • 균형 잡힌 영양 섭취<br>
        • 적절한 운동<br>
        • 스트레스 관리<br><br>
        <strong>Tip:</strong> 지속적이거나 심각한 증상의 경우 반드시 전문의와 상담하시기 바랍니다..!
      `,
      keywords: ["종합비타민", "건강보조식품", "영양제"],
    })
  }
}
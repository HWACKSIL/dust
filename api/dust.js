// Vercel 서버리스 함수 핸들러 (Node.js 환경)
module.exports = async (req, res) => {
  // CORS 허용 헤더 설정 (모든 도메인 허용)
  res.setHeader('Access-Control-Allow-Credentials', true);
  // GET, OPTIONS 메서드 허용
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  // 허용 헤더 지정
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // OPTIONS 프리플라이트 요청 처리
  if (req.method === 'OPTIONS') {
    // 200 성공 응답 반환 후 종료
    res.status(200).end();
    return;
  }

  // 요청 쿼리에서 시도 이름(sido) 추출 (없으면 기본값 '서울')
  const sido = req.query.sido || '서울';

  // 환경변수에서 에어코리아 디코딩 인증키 읽기
  const rawKey = process.env.AIRKOREA_KEY;

  // 인증키 환경변수가 설정되지 않은 경우 예외 응답 처리
  if (!rawKey) {
    // 500 상태코드와 함께 한국어 에러 메시지 반환
    return res.status(500).json({
      error: '서버 환경변수(AIRKOREA_KEY)가 설정되지 않았습니다. .env.local 또는 Vercel 설정을 확인해주세요.'
    });
  }

  try {
    // 디코딩 인증키를 안전하게 URL 인코딩 처리
    const encodedKey = encodeURIComponent(rawKey);

    // 시도 이름도 안전하게 URL 인코딩 처리
    const encodedSido = encodeURIComponent(sido);

    // 공공데이터포털 에어코리아 실시간 측정정보 조회 API URL 조합
    const apiUrl = `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty?serviceKey=${encodedKey}&returnType=json&sidoName=${encodedSido}&numOfRows=100&pageNo=1&ver=1.3`;

    // 에어코리아 API 서버로 비동기 요청 전송
    const apiResponse = await fetch(apiUrl);

    // 응답 본문을 텍스트 형태로 먼저 수신
    const responseText = await apiResponse.text();

    // 응답 데이터 JSON 파싱 변수
    let jsonData = null;

    // JSON 형식 변환 시도
    try {
      // 텍스트를 JSON 객체로 파싱
      jsonData = JSON.parse(responseText);
    } catch (parseError) {
      // JSON 파싱 실패 시 (XML 에러 또는 HTML 응답인 경우)
      console.error('응답 JSON 파싱 실패 (XML/HTML 응답):', responseText);
      // 사용자에게 친절한 한국어 안내 메시지 반환
      return res.status(400).json({
        error: '인증키 또는 요청값을 확인해주세요. (공공데이터포털에서 유효하지 않은 응답 수신)'
      });
    }

    // 공공데이터 API 응답 헤더의 결과 코드 추출
    const resultCode = jsonData.response?.header?.resultCode;

    // 결과 메시지 추출
    const resultMsg = jsonData.response?.header?.resultMsg || '알 수 없는 오류';

    // 결과 코드가 성공('00')이 아닌 경우 처리
    if (resultCode && resultCode !== '00') {
      // 클라이언트에게 실패 사유와 함께 한국어 메시지 전달
      return res.status(400).json({
        error: `공공데이터 API 처리 실패: [${resultCode}] ${resultMsg}`
      });
    }

    // 정상적으로 수신된 미세먼지 측정 데이터를 클라이언트로 전달
    return res.status(200).json(jsonData);

  } catch (error) {
    // 서버 내부 에러 발생 시 콘솔 로그 출력
    console.error('서버리스 함수 실행 중 오류:', error);

    // 클라이언트에 500 에러 및 한국어 안내 메시지 반환
    return res.status(500).json({
      error: '에어코리아 서버와 통신하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};


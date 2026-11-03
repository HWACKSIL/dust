// 내부 Vercel 서버리스 함수 엔드포인트 주소
const API_BASE_URL = '/api/dust';

// 시도 선택 드롭다운 DOM 엘리먼트 가져오기
const sidoSelect = document.getElementById('sidoSelect');

// 측정소 목록을 렌더링할 그리드 컨테이너 엘리먼트
const stationGrid = document.getElementById('stationGrid');

// 데이터 로딩 및 안내 메시지 표시 엘리먼트
const loadingStatus = document.getElementById('loadingStatus');

// 지역 평균 미세먼지 수치 텍스트 표시 엘리먼트
const avgPm10Element = document.getElementById('avgPm10');

// 현재 선택된 지역명 텍스트 표시 엘리먼트
const currentRegionText = document.getElementById('currentRegionText');

// 평균 상태(좋음/보통 등) 텍스트 표시 엘리먼트
const avgStatusElement = document.getElementById('avgStatus');

// 드롭다운 변경 시 대기오염 데이터를 다시 불러오는 이벤트 리스너 등록
sidoSelect.addEventListener('change', () => {
  // 선택된 시도명으로 데이터 요청 함수 호출
  fetchAirQualityData(sidoSelect.value);
});

// 페이지 초기 로드 완료 시 기본 선택값('서울')으로 첫 데이터 호출
window.addEventListener('DOMContentLoaded', () => {
  // 초기 지역 데이터 호출 실행
  fetchAirQualityData(sidoSelect.value);
});

// Vercel 서버리스 함수(/api/dust)를 호출하여 대기오염 정보를 받아오는 비동기 함수
async function fetchAirQualityData(sidoName) {
  // 현재 선택된 지역명 화면에 업데이트
  currentRegionText.textContent = sidoName;

  // 로딩 상태 메시지 표시
  loadingStatus.style.display = 'block';

  // 로딩 진행 문구 설정
  loadingStatus.textContent = `${sidoName} 지역의 대기오염 정보를 불러오는 중입니다...`;

  // 기존 카드 목록 초기화 비우기
  stationGrid.innerHTML = '';

  // 평균 미세먼지 수치 초기화
  avgPm10Element.innerHTML = `- <span class="unit">µg/m³</span>`;

  // 평균 미세먼지 상태 텍스트 초기화
  avgStatusElement.textContent = '계산 중...';

  try {
    // Vercel 서버리스 함수 주소에 시도 파라미터 연결 (예: /api/dust?sido=서울)
    const requestUrl = `${API_BASE_URL}?sido=${encodeURIComponent(sidoName)}`;

    // 서버리스 API로 GET 비동기 요청 전송
    const response = await fetch(requestUrl);

    // JSON 형식으로 응답 데이터 파싱
    const data = await response.json();

    // 서버에서 에러 객체(error)를 반환했거나 응답 상태가 비정상인 경우
    if (!response.ok || data.error) {
      // 서버에서 전달된 한국어 에러 메시지 추출
      const errorMessage = data.error || `서버 통신 오류 (상태코드: ${response.status})`;
      // 에러 예외 발생
      throw new Error(errorMessage);
    }

    // 응답 데이터 내 측정소 목록 아이템 추출
    const items = data.response?.body?.items || [];

    // 받아온 측정소 목록이 비어있는 경우 처리
    if (items.length === 0) {
      // 안내 문구 출력
      loadingStatus.textContent = '조회된 측정소 데이터가 없습니다.';
      // 평균 상태 문구 갱신
      avgStatusElement.textContent = '데이터 없음';
      // 함수 실행 종료
      return;
    }

    // 로딩 메시지 숨김 처리
    loadingStatus.style.display = 'none';

    // 측정소 목록 카드 렌더링 및 평균 수치 계산 실행
    renderStations(items);

  } catch (error) {
    // 콘솔에 상세 오류 로그 출력
    console.error('API 호출 중 오류 발생:', error);

    // 사용자 화면에 친절한 한국어 에러 안내 문구 표시
    loadingStatus.textContent = error.message;

    // 평균 수치 표시창에 오류 상태 표시
    avgStatusElement.textContent = '오류 발생';
  }
}

// 측정소 목록 카드 렌더링 및 평균 수치 계산 함수
function renderStations(items) {
  // 유효한 미세먼지 수치 총합 누적 변수
  let totalPm10 = 0;

  // 유효한 수치를 가진 측정소 개수 카운트 변수
  let validPm10Count = 0;

  // 각 측정소 데이터를 순회하며 카드 생성
  items.forEach(item => {
    // 측정소명 추출
    const stationName = item.stationName || '알 수 없음';

    // 미세먼지 수치 (pm10Value) 값 정제
    const pm10Raw = item.pm10Value;

    // 초미세먼지 수치 (pm25Value) 값 정제
    const pm25Raw = item.pm25Value;

    // 측정 시각 (dataTime)
    const dataTime = item.dataTime || '시각 미제공';

    // 등급 정보 (pm10Grade)
    const grade = item.pm10Grade;

    // 수치가 '-' 이거나 비어있는 경우 '측정안됨' 처리 여부 확인
    const isPm10Valid = pm10Raw && pm10Raw !== '-' && !isNaN(Number(pm10Raw));

    // 미세먼지 화면 표시 문자열 결정
    const pm10Display = isPm10Valid ? `${pm10Raw} µg/m³` : '측정안됨';

    // 초미세먼지 유효성 검사
    const isPm25Valid = pm25Raw && pm25Raw !== '-' && !isNaN(Number(pm25Raw));

    // 초미세먼지 화면 표시 문자열 결정
    const pm25Display = isPm25Valid ? `${pm25Raw} µg/m³` : '측정안됨';

    // 유효한 미세먼지 수치인 경우 평균 계산용 합계와 카운트에 가산
    if (isPm10Valid) {
      // 숫자 변환 후 총합에 더하기
      totalPm10 += Number(pm10Raw);
      // 유효 개수 1 증가
      validPm10Count += 1;
    }

    // 등급 코드에 따른 스타일 클래스 및 텍스트 정보 매핑 함수 호출
    const gradeInfo = getGradeInfo(grade);

    // 카드 엘리먼트 생성
    const card = document.createElement('div');

    // 카드의 클래스 지정 (등급별 클래스 포함)
    card.className = `station-card ${gradeInfo.className}`;

    // 카드의 내부 HTML 구조 구성
    card.innerHTML = `
      <!-- 카드 헤더 (측정소명 및 등급 뱃지) -->
      <div class="card-header">
        <span class="station-name">${stationName}</span>
        <span class="card-badge ${gradeInfo.className}">${gradeInfo.text}</span>
      </div>
      <!-- 카드 바디 (미세먼지, 초미세먼지 수치) -->
      <div class="card-body">
        <div class="data-row">
          <span class="data-label">미세먼지 (PM10)</span>
          <span class="data-value">${pm10Display}</span>
        </div>
        <div class="data-row">
          <span class="data-label">초미세먼지 (PM2.5)</span>
          <span class="data-value">${pm25Display}</span>
        </div>
      </div>
      <!-- 카드 푸터 (측정시각) -->
      <div class="card-footer">
        측정시각: ${dataTime}
      </div>
    `;

    // 생성된 카드를 그리드 컨테이너에 추가
    stationGrid.appendChild(card);
  });

  // 평균 미세먼지 수치 화면 표시 갱신
  calculateAndDisplayAverage(totalPm10, validPm10Count);
}

// 등급 번호에 맞는 텍스트와 CSS 클래스 반환 함수
function getGradeInfo(grade) {
  // 등급 문자열 정리
  const gradeStr = grade ? String(grade).trim() : '';

  // 등급 1: 좋음 (파랑)
  if (gradeStr === '1') {
    // 좋음 정보 반환
    return { text: '좋음', className: 'grade-good' };
  }
  // 등급 2: 보통 (초록)
  else if (gradeStr === '2') {
    // 보통 정보 반환
    return { text: '보통', className: 'grade-normal' };
  }
  // 등급 3: 나쁨 (주황)
  else if (gradeStr === '3') {
    // 나쁨 정보 반환
    return { text: '나쁨', className: 'grade-bad' };
  }
  // 등급 4: 매우나쁨 (빨강)
  else if (gradeStr === '4') {
    // 매우나쁨 정보 반환
    return { text: '매우나쁨', className: 'grade-very-bad' };
  }
  // 등급값이 비어있거나 유효하지 않은 경우: 회색 카드 처리
  else {
    // 알수없음 정보 반환
    return { text: '정보없음', className: 'grade-unknown' };
  }
}

// 평균 미세먼지 수치 및 등급 상태 화면 갱신 함수
function calculateAndDisplayAverage(total, count) {
  // 유효한 측정소가 1개 이상인 경우 평균 계산
  if (count > 0) {
    // 소수점 첫째 자리까지 평균 계산
    const average = (total / count).toFixed(1);

    // 평균 수치 큰 글자로 표시
    avgPm10Element.innerHTML = `${average} <span class="unit">µg/m³</span>`;

    // 평균 수치에 따른 등급 문구 결정 (한국환경공단 PM10 기준)
    if (average <= 30) {
      // 0 ~ 30: 좋음
      avgStatusElement.textContent = `전체 상태: 좋음 (측정소 ${count}곳 기준)`;
    } else if (average <= 80) {
      // 31 ~ 80: 보통
      avgStatusElement.textContent = `전체 상태: 보통 (측정소 ${count}곳 기준)`;
    } else if (average <= 150) {
      // 81 ~ 150: 나쁨
      avgStatusElement.textContent = `전체 상태: 나쁨 (측정소 ${count}곳 기준)`;
    } else {
      // 151 이상: 매우나쁨
      avgStatusElement.textContent = `전체 상태: 매우나쁨 (측정소 ${count}곳 기준)`;
    }
  } else {
    // 유효한 수치가 전혀 없는 경우
    avgPm10Element.innerHTML = `- <span class="unit">µg/m³</span>`;
    // 상태 안내
    avgStatusElement.textContent = '유효한 측정 데이터 없음';
  }
}

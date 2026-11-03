// 내부 Vercel 서버리스 함수 엔드포인트 주소
const API_BASE_URL = '/api/dust';

// 시도 선택 셀렉트 박스 DOM 요소
const sidoSelect = document.getElementById('sidoSelect');

// 측정소 카드 그리드 컨테이너 DOM 요소
const stationGrid = document.getElementById('stationGrid');

// 데이터 로딩 및 상태 안내 메시지 요소
const loadingStatus = document.getElementById('loadingStatus');

// 대형 공기 신호등 전광판 카드 컨테이너
const trafficLightCard = document.getElementById('trafficLightCard');

// 대형 신호등 이모지 요소
const signalEmoji = document.getElementById('signalEmoji');

// 선택된 지역명 텍스트 표시 요소
const regionNameText = document.getElementById('regionNameText');

// 신호등 대표 상태 텍스트 (좋음/보통 등) 요소
const statusGradeText = document.getElementById('statusGradeText');

// 평균 미세먼지 수치 숫자 표시 요소
const avgValueNumber = document.getElementById('avgValueNumber');

// 한 줄 권고/안내 문구 표시 요소
const adviceText = document.getElementById('adviceText');

// 최신 측정 시각 표시 요소
const signalTimestamp = document.getElementById('signalTimestamp');

// 차트 섹션 컨테이너 DOM 요소
const chartSection = document.getElementById('chartSection');

// Chart.js 인스턴스를 저장할 전역 변수
let dustChartInstance = null;

// 시도 선택 드롭다운 변경 시 데이터 재조회 이벤트 리스너 등록
sidoSelect.addEventListener('change', () => {
  // 선택한 지역의 공기질 데이터 조회 함수 호출
  fetchAirQualityData(sidoSelect.value);
});

// 페이지 초기 진입 시 기본 선택 지역('서울')으로 첫 로드 실행
window.addEventListener('DOMContentLoaded', () => {
  // 초기 데이터 호출
  fetchAirQualityData(sidoSelect.value);
});

// 날짜 문자열(예: '2026-10-28 16:00')을 '2026년 10월 28일 16시 기준' 형태로 변환하는 함수
function formatKoreanDateTime(dateTimeStr) {
  // 데이터가 없거나 유효하지 않은 경우 대비
  if (!dateTimeStr || dateTimeStr === '시각 미제공') {
    // 기본 대체 텍스트 반환
    return '측정 시각: 정보 없음';
  }

  try {
    // 공백을 기준으로 날짜 부분과 시간 부분 분리
    const parts = dateTimeStr.trim().split(' ');
    // 날짜 부분 추출
    const datePart = parts[0];
    // 시간 부분 추출
    const timePart = parts[1] || '';

    // 연, 월, 일 분리
    const dateTokens = datePart.split('-');
    // 연도 숫자
    const year = dateTokens[0];
    // 월 숫자 (앞자리 0 제거를 위해 숫자로 변환)
    const month = parseInt(dateTokens[1], 10);
    // 일 숫자 (앞자리 0 제거를 위해 숫자로 변환)
    const day = parseInt(dateTokens[2], 10);

    // 시 분 분리
    const timeTokens = timePart.split(':');
    // 시 숫자 (앞자리 0 제거를 위해 숫자로 변환)
    const hour = parseInt(timeTokens[0], 10);

    // 유효한 파싱 결과인 경우 한국어 날짜 포맷 반환
    if (!isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(hour)) {
      // 한국어 기준 시각 형식 반환
      return `${year}년 ${month}월 ${day}일 ${hour}시 기준`;
    }
  } catch (e) {
    // 파싱 중 예외 발생 시 원본에 기준 문구 추가
    console.error('날짜 포맷 파싱 오류:', e);
  }

  // 예외 시 원본 포맷 반환
  return `${dateTimeStr} 기준`;
}

// Vercel 서버리스 함수를 통해 대기오염 정보를 받아오는 비동기 함수
async function fetchAirQualityData(sidoName) {
  // 지역명 텍스트 업데이트
  regionNameText.textContent = sidoName;

  // 로딩 상태 요소 표시
  loadingStatus.style.display = 'block';

  // 로딩 안내 텍스트 설정
  loadingStatus.textContent = '불러오는 중...';

  // 신호등 전광판 기본 로딩 상태로 초기화
  trafficLightCard.className = 'traffic-light-card theme-unknown';

  // 신호등 이모지 로딩 상태로 설정
  signalEmoji.textContent = '⚪';

  // 상태 텍스트 로딩 중 표시
  statusGradeText.textContent = '불러오는 중...';

  // 평균 숫자 로딩 표시
  avgValueNumber.textContent = '-';

  // 한 줄 안내 문구 로딩 표시
  adviceText.textContent = '실시간 대기오염 정보를 불러오는 중입니다...';

  // 측정 시각 로딩 표시
  signalTimestamp.textContent = '측정 시각: 불러오는 중...';

  // 기존 측정소 카드 그리드 비우기
  stationGrid.innerHTML = '';

  try {
    // Vercel 서버리스 API 요청 주소 생성
    const requestUrl = `${API_BASE_URL}?sido=${encodeURIComponent(sidoName)}`;

    // GET 요청 실행
    const response = await fetch(requestUrl);

    // 응답 본문 JSON 파싱
    const data = await response.json();

    // 서버 에러 응답 처리
    if (!response.ok || data.error) {
      // 에러 메시지 추출
      const errorMessage = data.error || `서버 오류 (코드: ${response.status})`;
      // 에러 투척
      throw new Error(errorMessage);
    }

    // 측정소 목록 배열 추출
    const items = data.response?.body?.items || [];

    // 조회 결과가 비어있는 경우 처리
    if (items.length === 0) {
      // 로딩 창에 안내 문구 표시
      loadingStatus.textContent = '조회된 측정소 데이터가 없습니다.';
      // 상태 텍스트 갱신
      statusGradeText.textContent = '데이터 없음';
      // 안내 문구 갱신
      adviceText.textContent = '해당 지역의 대기질 데이터를 찾을 수 없습니다.';
      // 차트 섹션 숨기기
      chartSection.style.display = 'none';
      // 종료
      return;
    }

    // 로딩 메시지 숨기기
    loadingStatus.style.display = 'none';

    // 차트 섹션 보이기
    chartSection.style.display = 'block';

    // 측정소 데이터 렌더링 및 공기 신호등 전광판 갱신
    renderStationsAndSignal(items, sidoName);

    // 가로 막대 그래프 렌더링 함수 호출
    renderTop10Chart(items);

  } catch (error) {
    // 콘솔 에러 출력
    console.error('데이터 조회 오류:', error);

    // 사용자 화면에 에러 문구 표시
    loadingStatus.textContent = error.message;

    // 신호등 안내 문구에 에러 표시
    adviceText.textContent = error.message;

    // 상태 텍스트에 오류 표시
    statusGradeText.textContent = '오류 발생';

    // 오류 시 차트 섹션 숨기기
    chartSection.style.display = 'none';
  }
}

// 측정소 카드 렌더링 및 신호등 전광판 상태 업데이트 함수
function renderStationsAndSignal(items, sidoName) {
  // 미세먼지 총합 누적 변수
  let totalPm10 = 0;

  // 유효한 측정소 개수 누적 변수
  let validPm10Count = 0;

  // 가장 최신의 측정 시각 저장 변수
  let latestDataTime = '';

  // 각 측정소 순회 처리
  items.forEach(item => {
    // 측정소 이름
    const stationName = item.stationName || '알 수 없음';

    // 미세먼지 원본값
    const pm10Raw = item.pm10Value;

    // 초미세먼지 원본값
    const pm25Raw = item.pm25Value;

    // 측정 시각
    const dataTime = item.dataTime || '시각 미제공';

    // 최신 시각 저장 갱신
    if (!latestDataTime && dataTime && dataTime !== '시각 미제공') {
      // 첫 유효 측정 시각으로 설정
      latestDataTime = dataTime;
    }

    // 등급 코드 (1, 2, 3, 4)
    const grade = item.pm10Grade;

    // 미세먼지 수치 유효성 검사 ( '-' 또는 공백, 숫자가 아닌 경우 제외 )
    const isPm10Valid = pm10Raw && pm10Raw !== '-' && !isNaN(Number(pm10Raw));

    // 미세먼지 화면 표시 문자열
    const pm10Display = isPm10Valid ? `${pm10Raw} µg/m³` : '측정안됨';

    // 초미세먼지 유효성 검사
    const isPm25Valid = pm25Raw && pm25Raw !== '-' && !isNaN(Number(pm25Raw));

    // 초미세먼지 화면 표시 문자열
    const pm25Display = isPm25Valid ? `${pm25Raw} µg/m³` : '측정안됨';

    // 유효한 수치일 때만 평균 계산에 포함
    if (isPm10Valid) {
      // 숫자 누적
      totalPm10 += Number(pm10Raw);
      // 유효 카운트 증가
      validPm10Count += 1;
    }

    // 등급별 스타일 및 텍스트 정보 매핑
    const gradeInfo = getGradeInfo(grade);

    // 개별 측정소 카드 엘리먼트 생성
    const card = document.createElement('div');

    // 카드의 클래스 지정 (은은한 배경과 테두리를 위한 card-* 클래스 추가)
    card.className = `station-card ${gradeInfo.cardClass}`;

    // 한국어 기준 시각 포맷 변환
    const koreanFormattedTime = formatKoreanDateTime(dataTime);

    // 카드 내부 HTML 구성
    card.innerHTML = `
      <!-- 카드 헤더 (측정소명 및 등급 이모지 뱃지) -->
      <div class="card-header">
        <span class="station-name">${stationName}</span>
        <span class="card-badge">${gradeInfo.emoji} ${gradeInfo.text}</span>
      </div>
      <!-- 카드 바디 (미세먼지 및 초미세먼지 수치) -->
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
      <!-- 카드 푸터 (한국어 측정 시각) -->
      <div class="card-footer">
        ${koreanFormattedTime}
      </div>
    `;

    // 측정소 그리드에 카드 추가
    stationGrid.appendChild(card);
  });

  // 상단 최신 측정 시각 표시 갱신
  signalTimestamp.textContent = latestDataTime ? formatKoreanDateTime(latestDataTime) : '측정 시각: 정보 없음';

  // 상단 대형 공기 신호등 전광판 상태 업데이트
  updateTrafficLight(totalPm10, validPm10Count, sidoName);
}

// 등급 코드(1~4)에 따른 스타일 및 텍스트 반환 함수
function getGradeInfo(grade) {
  // 문자열 정제
  const g = grade ? String(grade).trim() : '';

  // 1: 좋음 (파랑)
  if (g === '1') {
    // 파랑 정보 반환
    return { text: '좋음', emoji: '🔵', cardClass: 'card-good', color: '#3182ce', bgColor: 'rgba(49, 130, 206, 0.7)' };
  }
  // 2: 보통 (초록)
  else if (g === '2') {
    // 초록 정보 반환
    return { text: '보통', emoji: '🟢', cardClass: 'card-normal', color: '#38a169', bgColor: 'rgba(56, 161, 105, 0.7)' };
  }
  // 3: 나쁨 (주황)
  else if (g === '3') {
    // 주황 정보 반환
    return { text: '나쁨', emoji: '🟠', cardClass: 'card-bad', color: '#dd6b20', bgColor: 'rgba(221, 107, 32, 0.7)' };
  }
  // 4: 매우나쁨 (빨강)
  else if (g === '4') {
    // 빨강 정보 반환
    return { text: '매우나쁨', emoji: '🔴', cardClass: 'card-very-bad', color: '#e53e3e', bgColor: 'rgba(229, 62, 62, 0.7)' };
  }
  // 등급 없음 또는 미측정 (회색)
  else {
    // 회색 정보 반환
    return { text: '측정안됨', emoji: '⚪', cardClass: 'card-unknown', color: '#a0aec0', bgColor: 'rgba(160, 174, 192, 0.7)' };
  }
}

// 상단 대형 공기 신호등 전광판 갱신 함수
function updateTrafficLight(total, count, sidoName) {
  // 유효한 측정 데이터가 없는 경우 처리
  if (count === 0) {
    // 이모지 회색
    signalEmoji.textContent = '⚪';
    // 상태 텍스트
    statusGradeText.textContent = '측정 불가';
    // 평균 숫자
    avgValueNumber.textContent = '-';
    // 안내 문구
    adviceText.textContent = '유효한 미세먼지 측정 정보가 없습니다.';
    // 테마 클래스 초기화
    trafficLightCard.className = 'traffic-light-card theme-unknown';
    // 종료
    return;
  }

  // 평균 미세먼지 수치 계산 (소수점 첫째 자리)
  const average = Number((total / count).toFixed(1));

  // 큰 숫자로 평균 수치 표시
  avgValueNumber.textContent = average;

  // 한국환경공단 PM10 기준 신호등 등급 분기
  // 0 ~ 30: 좋음 (파랑 🔵)
  if (average <= 30) {
    // 이모지
    signalEmoji.textContent = '🔵';
    // 상태 텍스트
    statusGradeText.textContent = '좋음';
    // 한 줄 안내 문구
    adviceText.textContent = '🌿 공기가 맑고 쾌적해요! 산책과 야외활동을 즐기기 좋습니다.';
    // 전광판 파란색 테마 적용
    trafficLightCard.className = 'traffic-light-card theme-good';
  }
  // 31 ~ 80: 보통 (초록 🟢)
  else if (average <= 80) {
    // 이모지
    signalEmoji.textContent = '🟢';
    // 상태 텍스트
    statusGradeText.textContent = '보통';
    // 한 줄 안내 문구
    adviceText.textContent = '🙂 무난한 공기 상태입니다. 일상적인 야외활동이 가능합니다.';
    // 전광판 초록색 테마 적용
    trafficLightCard.className = 'traffic-light-card theme-normal';
  }
  // 81 ~ 150: 나쁨 (주황 🟠)
  else if (average <= 150) {
    // 이모지
    signalEmoji.textContent = '🟠';
    // 상태 텍스트
    statusGradeText.textContent = '나쁨';
    // 한 줄 안내 문구 (나쁨 이상 시 마스크 권고 필수 반영)
    adviceText.textContent = '😷 외출 시 마스크를 챙기세요! (공기가 탁하니 무리한 실외활동은 자제하세요)';
    // 전광판 주황색 테마 적용
    trafficLightCard.className = 'traffic-light-card theme-bad';
  }
  // 151 이상: 매우나쁨 (빨강 🔴)
  else {
    // 이모지
    signalEmoji.textContent = '🔴';
    // 상태 텍스트
    statusGradeText.textContent = '매우나쁨';
    // 한 줄 안내 문구 (나쁨 이상 시 마스크 권고 필수 반영)
    adviceText.textContent = '🚨 외출을 최대한 자제하고, 외출 시 보건용 마스크를 반드시 착용하세요!';
    // 전광판 빨간색 테마 적용
    trafficLightCard.className = 'traffic-light-card theme-very-bad';
  }
}

// Chart.js를 사용해 미세먼지 수치 상위 10개 가로 막대 그래프를 렌더링하는 함수
function renderTop10Chart(items) {
  // Chart.js 라이브러리가 로드되었는지 확인
  if (typeof Chart === 'undefined') {
    // 콘솔 경고 출력 후 종료
    console.warn('Chart.js 라이브러리가 아직 로드되지 않았습니다.');
    return;
  }

  // 1. '측정안됨'('-' 및 비어있는 값)을 제외한 유효한 측정소만 필터링
  const validItems = items.filter(item => {
    // pm10Value 값 추출
    const val = item.pm10Value;
    // 유효한 숫자인지 여부 확인
    return val && val !== '-' && !isNaN(Number(val));
  });

  // 유효한 데이터가 없을 경우 차트 섹션 숨기기
  if (validItems.length === 0) {
    // 숨김 처리
    chartSection.style.display = 'none';
    return;
  }

  // 2. 미세먼지 수치가 높은 순(내림차순)으로 정렬 후 상위 10개만 선택
  const top10Items = validItems
    .sort((a, b) => Number(b.pm10Value) - Number(a.pm10Value))
    .slice(0, 10);

  // 차트 X축 레이블(측정소 이름) 배열 생성
  const labels = top10Items.map(item => item.stationName || '알 수 없음');

  // 차트 실제 미세먼지 수치 데이터 배열 생성
  const dataValues = top10Items.map(item => Number(item.pm10Value));

  // 각 측정소 등급에 맞춘 막대 배경색 배열 생성
  const backgroundColors = top10Items.map(item => {
    // 등급 정보 조회
    const info = getGradeInfo(item.pm10Grade);
    // 막대 배경색 반환
    return info.bgColor;
  });

  // 각 측정소 등급에 맞춘 막대 테두리색 배열 생성
  const borderColors = top10Items.map(item => {
    // 등급 정보 조회
    const info = getGradeInfo(item.pm10Grade);
    // 테두리 진한 색 반환
    return info.color;
  });

  // 캔버스 엘리먼트 가져오기
  const ctx = document.getElementById('dustChart').getContext('2d');

  // 기존 차트 인스턴스가 존재할 경우 중복 방지를 위해 파기(destroy)
  if (dustChartInstance) {
    // 차트 인스턴스 파기
    dustChartInstance.destroy();
  }

  // 가로 막대 그래프 생성 (indexAxis: 'y')
  dustChartInstance = new Chart(ctx, {
    // 차트 유형: bar
    type: 'bar',
    data: {
      // Y축 라벨 (측정소명)
      labels: labels,
      datasets: [{
        // 범례 라벨
        label: '미세먼지 (PM10)',
        // 수치 데이터
        data: dataValues,
        // 등급별 개별 배경색 적용
        backgroundColor: backgroundColors,
        // 등급별 개별 테두리색 적용
        borderColor: borderColors,
        // 테두리 두께
        borderWidth: 1.5,
        // 막대 모서리 둥글게 처리
        borderRadius: 6,
        // 막대 두께 비율
        barPercentage: 0.7
      }]
    },
    options: {
      // 가로 막대 그래프 설정 (indexAxis: 'y')
      indexAxis: 'y',
      // 반응형 크기 조절 활성화
      responsive: true,
      // 캔버스 비율 유지 해제 (컨테이너에 맞춤)
      maintainAspectRatio: false,
      plugins: {
        // 범례 숨김 (라벨이 불필요하므로 깔끔하게 처리)
        legend: {
          display: false
        },
        // 툴팁(마우스 올렸을 때 상세 정보) 설정
        tooltip: {
          // 패딩
          padding: 10,
          // 폰트 설정
          titleFont: { family: 'Pretendard', size: 13, weight: 'bold' },
          bodyFont: { family: 'Pretendard', size: 12 },
          // 콜백으로 단위 붙이기
          callbacks: {
            label: function(context) {
              return ` 미세먼지: ${context.parsed.x} µg/m³`;
            }
          }
        }
      },
      scales: {
        // X축 (미세먼지 수치 축)
        x: {
          // 0부터 시작
          beginAtZero: true,
          grid: {
            // 연한 모눈선
            color: '#edf2f7'
          },
          ticks: {
            // 폰트 설정
            font: { family: 'Pretendard', size: 11 },
            color: '#718096'
          }
        },
        // Y축 (측정소 이름 축)
        y: {
          grid: {
            // 가로선 제거하여 깔끔하게
            display: false
          },
          ticks: {
            // 폰트 설정
            font: { family: 'Pretendard', size: 12, weight: '600' },
            color: '#2d3748'
          }
        }
      }
    }
  });
}

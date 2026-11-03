import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import os
import sys

PORT = 3000

# .env.local 파일에서 AIRKOREA_KEY 읽기
def get_api_key():
    env_file = os.path.join(os.path.dirname(__file__), '.env.local')
    if os.path.exists(env_file):
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line.startswith('AIRKOREA_KEY='):
                    return line.split('=', 1)[1].strip()
    return os.environ.get('AIRKOREA_KEY', '')

class DustHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        # /api/dust 요청 처리 (Vercel 서버리스 함수 동작과 동일)
        if parsed.path == '/api/dust':
            query = urllib.parse.parse_qs(parsed.query)
            sido = query.get('sido', ['서울'])[0]
            api_key = get_api_key()
            
            if not api_key or '여기에' in api_key:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                res = {'error': '.env.local 파일에 AIRKOREA_KEY 인증키를 올바르게 입력해주세요.'}
                self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
                return

            # 에어코리아 API URL 조합
            encoded_key = urllib.parse.quote(api_key, safe='')
            encoded_sido = urllib.parse.quote(sido, safe='')
            target_url = (
                f"https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty"
                f"?serviceKey={encoded_key}&returnType=json&sidoName={encoded_sido}&numOfRows=100&pageNo=1&ver=1.3"
            )
            
            try:
                req = urllib.request.Request(target_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data_bytes = resp.read()
                    data_text = data_bytes.decode('utf-8', errors='replace')
                    
                    try:
                        json_data = json.loads(data_text)
                        result_code = json_data.get('response', {}).get('header', {}).get('resultCode')
                        result_msg = json_data.get('response', {}).get('header', {}).get('resultMsg', '오류')
                        
                        if result_code and result_code != '00':
                            self.send_response(400)
                            self.send_header('Content-Type', 'application/json; charset=utf-8')
                            self.end_headers()
                            res = {'error': f"공공데이터 API 처리 실패: [{result_code}] {result_msg}"}
                            self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
                            return

                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json; charset=utf-8')
                        self.end_headers()
                        self.wfile.write(data_bytes)
                    except json.JSONDecodeError:
                        self.send_response(400)
                        self.send_header('Content-Type', 'application/json; charset=utf-8')
                        self.end_headers()
                        res = {'error': '인증키 또는 요청값을 확인해주세요. (공공데이터포털 XML/비정상 응답 수신)'}
                        self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                res = {'error': f'서버 통신 오류: {str(e)}'}
                self.wfile.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
            return
            
        # 일반 정적 파일 서빙 (index.html, style.css, script.js 등)
        return super().do_GET()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), DustHandler) as httpd:
        print(f"로컬 웹 서버가 시작되었습니다: http://localhost:{PORT}")
        sys.stdout.flush()
        httpd.serve_forever()


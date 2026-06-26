# 허민영 HR 포트폴리오 사이트

순수 HTML/CSS/JS(프론트) + Node.js 내장 모듈(백엔드)로 만든 **다중 페이지 + 자체 수정 가능한** 포트폴리오 사이트입니다.
폰트는 Pretendard, 컬러는 크림 + 브릭레드 테마입니다.

## 실행 방법

```bash
node server.js   # 또는 npm start
```

- 포트폴리오: http://localhost:3000
- 관리자 페이지: http://localhost:3000/admin

## 페이지 구성 (다중 페이지)

| 경로 | 내용 |
| --- | --- |
| `/` | Home — 히어로 + 대표 프로젝트 |
| `/about` | 소개 · 스킬 · 툴 · 경력 · 자격증 · 어학 |
| `/projects` | 프로젝트 목록(카드) |
| `/project?id=N` | 프로젝트 상세 — 커버·영상·갤러리·링크 |
| `/contact` | 연락처 |
| `/admin` | 관리자 편집 |

## 관리자(자체 수정) 사용법

1. `/admin` 접속 → **최초 비밀번호 `admin1234`** (로그인 후 변경 권장)
2. 각 섹션을 폼에서 수정
3. **사진·영상 업로드**: 프로필 사진, 프로젝트 커버/영상/갤러리는 `📎 업로드` 버튼으로 파일을 올리면 서버 `public/uploads/`에 저장되고 URL이 자동 입력됩니다. (URL 직접 입력도 가능, YouTube/Vimeo 링크 지원)
4. **관련 링크**: 프로젝트마다 라벨+URL 링크를 여러 개 추가 가능
5. **저장하기** → 서버 `data/content.json`에 영구 저장

## 구조

```
포트폴리오 사이트/
├─ server.js            # 정적 서빙 + API(로그인/내용/업로드) + 깨끗한 URL 라우팅
├─ data/
│  ├─ content.json      # 사이트 내용
│  └─ config.json       # 관리자 비밀번호(자동 생성, git 제외)
└─ public/
   ├─ index / about / projects / project / contact / admin .html
   ├─ uploads/          # 업로드된 사진·영상 (git 제외)
   ├─ css/ (style.css, admin.css)
   └─ js/  (common, home, about, projects, project, contact, admin)
```

## API

| 메서드 | 경로 | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/api/content` | 사이트 내용 조회 | - |
| POST | `/api/login` | 로그인(토큰 발급) | - |
| PUT | `/api/content` | 내용 저장 | 필요 |
| POST | `/api/upload?name=파일명` | 파일 업로드(최대 50MB) | 필요 |
| POST | `/api/password` | 비밀번호 변경 | 필요 |

## 보안 메모

- 비밀번호는 salt + SHA-256 해시로 저장, 로그인 시 HMAC 서명 토큰(12시간) 발급
- 업로드 파일명은 정리 후 랜덤 접두사로 저장
- 외부 공개 배포 시 HTTPS 권장

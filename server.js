/**
 * 포트폴리오 사이트 백엔드
 * - 외부 라이브러리 없이 Node.js 내장 모듈만 사용
 * - 정적 파일(public) 서빙
 * - 관리자 로그인 + 내용(content.json) 영구 저장 API
 *
 * 실행:  node server.js   (또는 npm start)
 * 접속:  http://localhost:3000        (포트폴리오)
 *        http://localhost:3000/admin  (관리자)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const CONTENT_FILE = path.join(DATA_DIR, "content.json");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads");

// 업로드 폴더 보장
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ───────────────────────────────────────────── 설정/비밀번호 초기화
function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    // 최초 실행 시 기본 비밀번호로 config 생성
    const salt = crypto.randomBytes(16).toString("hex");
    const defaultPassword = "admin1234";
    const config = {
      salt,
      passwordHash: sha256(salt + defaultPassword),
      secret: crypto.randomBytes(32).toString("hex"),
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log("\n⚠️  최초 실행: 관리자 기본 비밀번호는 'admin1234' 입니다.");
    console.log("    로그인 후 반드시 비밀번호를 변경하세요.\n");
    return config;
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
}

let config = loadConfig();

// ───────────────────────────────────────────── 토큰 (HMAC 서명)
function createToken() {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30일 유효
  const payload = String(exp);
  const sig = crypto
    .createHmac("sha256", config.secret)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64");
}

function verifyToken(token) {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [payload, sig] = decoded.split(".");
    const expected = crypto
      .createHmac("sha256", config.secret)
      .update(payload)
      .digest("hex");
    if (sig !== expected) return false;
    if (Date.now() > Number(payload)) return false;
    return true;
  } catch {
    return false;
  }
}

function getBearer(req) {
  const auth = req.headers["authorization"] || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

// ───────────────────────────────────────────── 요청 본문 읽기
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 5 * 1024 * 1024) {
        // 5MB 초과 방지 (base64 이미지 고려)
        reject(new Error("본문이 너무 큽니다."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// 바이너리 본문 읽기 (파일 업로드용)
function readBinary(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("파일이 너무 큽니다. (최대 50MB)"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

// ───────────────────────────────────────────── 정적 파일 서빙
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
};

function serveStatic(req, res, pathname) {
  // 다중 페이지 깔끔한 URL: 확장자 없는 경로는 .html 로 매핑 (/about -> about.html, /admin -> admin.html)
  let rel = pathname === "/" ? "/index.html" : pathname;
  if (!path.extname(rel)) {
    rel = rel.replace(/\/+$/, "") + ".html";
  }

  // 경로 정규화로 디렉터리 탈출 방지
  const safePath = path
    .normalize(path.join(PUBLIC_DIR, rel))
    .replace(/^(\.\.[\/\\])+/, "");
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(safePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return res.end("<h1>404 - 페이지를 찾을 수 없습니다.</h1>");
    }
    const ext = path.extname(safePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(content);
  });
}

// ───────────────────────────────────────────── 라우팅
const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = reqUrl.pathname;

  // ── API ──
  if (pathname.startsWith("/api/")) {
    try {
      // 로그인
      if (pathname === "/api/login" && req.method === "POST") {
        const { password } = JSON.parse((await readBody(req)) || "{}");
        const hash = sha256(config.salt + (password || ""));
        if (hash === config.passwordHash) {
          return sendJSON(res, 200, { token: createToken() });
        }
        return sendJSON(res, 401, { error: "비밀번호가 올바르지 않습니다." });
      }

      // 토큰 유효성 확인 (편집 화면 진입 전 검사)
      if (pathname === "/api/verify" && req.method === "GET") {
        const ok = verifyToken(getBearer(req));
        return sendJSON(res, ok ? 200 : 401, { ok });
      }

      // 내용 조회 (공개)
      if (pathname === "/api/content" && req.method === "GET") {
        const content = fs.readFileSync(CONTENT_FILE, "utf8");
        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        });
        return res.end(content);
      }

      // 내용 저장 (인증 필요)
      if (pathname === "/api/content" && req.method === "PUT") {
        if (!verifyToken(getBearer(req))) {
          return sendJSON(res, 401, { error: "인증이 필요합니다." });
        }
        const raw = await readBody(req);
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return sendJSON(res, 400, { error: "잘못된 JSON 형식입니다." });
        }
        // 백업 후 저장
        if (fs.existsSync(CONTENT_FILE)) {
          fs.copyFileSync(CONTENT_FILE, CONTENT_FILE + ".bak");
        }
        fs.writeFileSync(CONTENT_FILE, JSON.stringify(parsed, null, 2));
        return sendJSON(res, 200, { ok: true });
      }

      // 비밀번호 변경 (인증 필요)
      if (pathname === "/api/password" && req.method === "POST") {
        if (!verifyToken(getBearer(req))) {
          return sendJSON(res, 401, { error: "인증이 필요합니다." });
        }
        const { current, next } = JSON.parse((await readBody(req)) || "{}");
        if (sha256(config.salt + (current || "")) !== config.passwordHash) {
          return sendJSON(res, 401, { error: "현재 비밀번호가 틀립니다." });
        }
        if (!next || next.length < 4) {
          return sendJSON(res, 400, { error: "새 비밀번호는 4자 이상이어야 합니다." });
        }
        const salt = crypto.randomBytes(16).toString("hex");
        config = { ...config, salt, passwordHash: sha256(salt + next) };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        return sendJSON(res, 200, { ok: true });
      }

      // 파일 업로드 (인증 필요) — 사진/영상/문서 등
      if (pathname === "/api/upload" && req.method === "POST") {
        if (!verifyToken(getBearer(req))) {
          return sendJSON(res, 401, { error: "인증이 필요합니다." });
        }
        const buf = await readBinary(req, 50 * 1024 * 1024); // 50MB
        const original = reqUrl.searchParams.get("name") || "file";
        // 파일명 정리: 경로 제거 + 위험문자 치환 + 충돌 방지용 랜덤 접두사
        const base = original.replace(/[\\/]/g, "_").replace(/[^a-zA-Z0-9._\-가-힣]/g, "_").slice(-80) || "file";
        const finalName = crypto.randomBytes(6).toString("hex") + "_" + base;
        fs.writeFileSync(path.join(UPLOAD_DIR, finalName), buf);
        return sendJSON(res, 200, { url: "/uploads/" + finalName });
      }

      return sendJSON(res, 404, { error: "알 수 없는 API 입니다." });
    } catch (err) {
      return sendJSON(res, 500, { error: err.message });
    }
  }

  // ── 정적 파일 ──
  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`\n✅ 포트폴리오 서버 실행 중`);
  console.log(`   포트폴리오 : http://localhost:${PORT}`);
  console.log(`   관리자      : http://localhost:${PORT}/admin\n`);
});

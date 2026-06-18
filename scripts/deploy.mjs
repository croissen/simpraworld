// SimpraWorld 캔버스 앱 — 이 repo만 커밋·푸시 (독립 repo).
// 사용: npm run deploy            (메시지 기본 "deploy")
//       npm run deploy -- "메시지"
// 참고: 라이브(simpraworld.com/my-universe) 자동배포는 이 repo를 자체 Cloudflare
//       프로젝트에 연결했을 때만 일어남. 아직 미연결이면 push=소스 백업까지만.
import { execSync } from 'node:child_process'

const msg = process.argv.slice(2).join(' ').trim() || 'deploy'
const run = (cmd) => execSync(cmd, { stdio: 'inherit', shell: true })
const tryRun = (cmd) => {
  try {
    run(cmd)
  } catch {
    console.log(`  (skip) ${cmd}`)
  }
}

run('git add -A')
tryRun(`git commit -m "${msg}"`) // 변경 없으면 건너뜀
run('git push')
console.log('\n✅ pushed.')

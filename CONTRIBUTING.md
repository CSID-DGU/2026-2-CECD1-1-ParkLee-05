# CONTRIBUTING (검토용 초안)

> ZIPSA 팀 협업 규칙 초안입니다. 합의 후 저장소 루트로 옮겨 커밋합니다.
> 스택: **Backend** Spring Boot (`ZIPSA_WEB/backend`) · **Frontend** React (`ZIPSA_WEB/frontend`)

---

## 1. 브랜치 구성

| 브랜치 | 용도 | 규칙 |
|---|---|---|
| `main` | 안정 버전 / 과제 제출용 | 보호 브랜치. 직접 push 금지, `develop`에서 PR로만 반영 |
| `develop` | 개발 통합 브랜치 (기본 브랜치) | 직접 push 금지, 작업 브랜치에서 PR로만 반영 |
| `feature/#이슈번호-설명` | 기능 개발 | `develop`에서 분기 |
| `fix/#이슈번호-설명` | 버그 수정 | `develop`에서 분기 |
| `hotfix/#이슈번호-설명` | `main`의 긴급 수정 | `main`에서 분기 → `main`, `develop` 모두에 반영 |

**영역 접두 권장**: 설명 앞에 `be` / `fe`를 붙여 영역을 구분합니다.

```
feature/#12-be-chat-api
feature/#15-fe-login-page
fix/#21-be-token-expire
```

- 설명은 영어 소문자 + 하이픈(kebab-case)으로 짧게 씁니다.

---

## 2. 작업 흐름

```
이슈 생성 → develop에서 브랜치 → 커밋 → develop으로 PR → 리뷰 → Squash merge → 브랜치 삭제
                                                        (마일스톤마다) develop → main PR + 태그
```

### 2-1. 이슈 생성
- 모든 작업은 GitHub Issue에서 시작합니다.
- 라벨을 붙입니다. (예: `feature`, `bug`, `docs`, `refactor`, `chore`, `BE`, `FE`)
- Notion WBS의 해당 작업 항목과 이슈를 서로 링크합니다. (WBS에 이슈 번호, 이슈 본문에 WBS 링크)
- 담당자(Assignee)와 마일스톤을 지정합니다.

### 2-2. 브랜치 생성
```bash
git switch develop
git pull origin develop
git switch -c feature/#12-be-chat-api
```

### 2-3. 커밋 컨벤션
형식: `타입: 요약 (#이슈번호)`

| 타입 | 의미 |
|---|---|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서 변경 |
| `refactor` | 동작 변화 없는 코드 개선 |
| `chore` | 빌드, 설정, 의존성 등 기타 |

```
feat: 채팅 메시지 전송 API 추가 (#12)
fix: 로그인 토큰 만료 처리 오류 수정 (#21)
docs: API 명세 업데이트 (#30)
```

- 요약은 한국어로, 마침표 없이 간결하게 씁니다.
- 하나의 커밋에는 하나의 논리적 변경만 담습니다.

### 2-4. Pull Request
- 대상 브랜치: `develop`
- 제목: 커밋 컨벤션과 동일한 형식 (Squash merge 시 커밋 메시지가 됨)
- 본문에 `Closes #이슈번호`를 적어 머지 시 이슈가 자동으로 닫히게 합니다.
- 변경 내용, 테스트 방법, 스크린샷(FE)을 간단히 적습니다.

### 2-5. 리뷰와 머지
- 최소 1명의 승인 후 머지합니다.
- 머지 방식은 **Squash merge**만 사용합니다.
- 머지 후 작업 브랜치는 삭제합니다. (저장소 설정으로 자동 삭제)

### 2-6. 릴리스 (마일스톤 단위)
- 마일스톤 완료 시 `develop` → `main` PR을 올립니다.
- 머지 후 `main`에 태그를 붙입니다.

```bash
git switch main
git pull origin main
git tag v0.1-중간발표
git push origin v0.1-중간발표
```

| 태그 예시 | 시점 |
|---|---|
| `v0.1-중간발표` | 중간 발표 |
| `v1.0-최종발표` | 최종 발표 / 제출 |

---

## 3. 저장소 설정 요약 (관리자)

| 항목 | 설정 |
|---|---|
| 기본 브랜치 | `develop` |
| 머지 방식 | Squash merge만 허용 (Merge commit, Rebase merge 비활성화) |
| 브랜치 자동 삭제 | "Automatically delete head branches" 활성화 |
| `main` 보호 규칙 | PR 필수, 승인 1명 이상, 직접 push·force push·삭제 금지 |
| `develop` 보호 규칙 | PR 필수, 승인 1명 이상, 직접 push·force push·삭제 금지 |

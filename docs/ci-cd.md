# CI/CD Pipeline Design — frontend

## Overview

The CI/CD pipeline runs on **GitHub Actions** (ADR-0001). It covers the full lifecycle
from PR validation through container release and GitOps update.

```
PR opened                         push to main                    Tag: v*
     │                                  │                              │
     ▼                                  ▼                              ▼
┌─────────┐  ┌──────┐  ┌───────┐  ┌───────┐  ┌───────────┐  ┌──────────────┐
│security │→ │ test │→ │ build │  │ build │→ │deploy-dev │  │   release    │
│(CodeQL, │  │(lint,│  │(Docker│  │(push  │  │(update    │  │(semver tag,  │
│Trivy fs,│  │vitest│  │build) │  │:sha-* │  │values-    │  │push :semver) │
│gitleaks)│  │     )│  │       │  │:main) │  │local.yaml)│  │              │
└─────────┘  └──────┘  └───────┘  └───────┘  └───────────┘  └──────────────┘
                                                   │                  │
                                    ArgoCD auto-syncs          ┌──────▼──────┐
                                    dev k8s cluster ←──────────│gitops-update│
                                    (immutable SHA tag)        │(PR to prod  │
                                                               │ values.yaml)│
                                                               └─────────────┘
```

### Two-track continuous deployment

| Track | Trigger | Image tag used | GitOps file updated | Review required |
|-------|---------|---------------|--------------------|-----------------|
| **Dev / local** | Every merge to `main` | `sha-<commit>` (immutable) | `values-local.yaml` | No — direct commit |
| **Production** | Version tag `v*` | `0.2.0` (semver, immutable) | `values-prod.yaml` via PR | Yes — PR review |

**Why immutable SHA tags for dev?** ArgoCD watches the GitOps repo for file changes, not the
container registry. A mutable tag like `:main` never changes in `values-local.yaml`, so
ArgoCD would never detect a new image and never resync. Updating the file to `sha-<commit>`
on every merge gives ArgoCD a real diff to react to.

## Pipeline Stages

### Stage 1: Security (runs on every PR and push to `main`)

| Step | Tool | Gate |
|------|------|------|
| CodeQL SAST | `github/codeql-action` — `security-extended`, language: `javascript` | CRITICAL/HIGH → block PR |
| Dependency audit | `devbox run security` → `npm audit --audit-level=high` | HIGH/CRITICAL CVE → block PR |
| Secrets scan | `devbox run security` → `gitleaks detect --no-git --quiet` | Any leak → block PR |
| Trivy filesystem | `aquasecurity/trivy-action` (fs, SARIF) | CRITICAL/HIGH → block PR |

### Stage 2: Test (runs on every PR and push to `main`)

| Step | Tool | Gate |
|------|------|------|
| Lint | `devbox run lint` → `eslint --max-warnings=0` | Warnings = failure |
| Unit + component tests | `devbox run test` → `npx vitest run --coverage` | Any failure → block PR |
| Coverage upload | `actions/upload-artifact` | Informational |

### Stage 3: Build (runs after security + test pass)

| Step | Tool | Gate |
|------|------|------|
| Docker build | `docker/build-push-action` (no push on PR) | Build failure → block |
| Container CVE scan | `aquasecurity/trivy-action` (image, `:main` tag) | CRITICAL/HIGH → block |
| Push image (main push only) | `ghcr.io/ika100/e2e-frontend:sha-<sha>` + `:main` | Push failure → block |

### Stage 4a: Deploy to dev (runs after build, on every push to `main`)

| Step | Action |
|------|--------|
| Checkout `ika100/e2e-gitops` | Uses `GITOPS_PAT` / `GITOPS_REPO` secrets |
| Update `apps/frontend/values-local.yaml` | `yq e -i ".image.tag = \"sha-<sha>\""` |
| Commit + push directly to gitops `main` | ArgoCD auto-syncs → dev k8s updated |

### Stage 4b: Release (runs only on `v*` tags)

| Step | Action |
|------|--------|
| Build + push release image | `ghcr.io/ika100/e2e-frontend:{semver}` + `:latest` |
| Create GitHub Release | `softprops/action-gh-release` with `.release-notes.md` |

### Stage 5: GitOps Update for prod (runs after release, `v*` tags only)

| Step | Action |
|------|--------|
| Checkout `ika100/e2e-gitops` | Uses `GITOPS_PAT` secret |
| Update `apps/frontend/values-prod.yaml` | `yq e -i ".image.tag = \"${VERSION}\""` |
| Open PR in gitops repo | `peter-evans/create-pull-request` — requires human review |

## GitHub Actions Workflow Template

```yaml
name: CI

on:
  push:
    branches: [main]
    tags: ["v*"]
  pull_request:
    branches: [main]

env:
  REGISTRY:   ghcr.io
  IMAGE_NAME: ghcr.io/ika100/e2e-frontend

permissions:
  contents:        read
  packages:        write
  security-events: write
  pull-requests:   read

jobs:
  security:
    name: Security
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: jetify-com/devbox-install-action@v0.4.0
        with: { enable-cache: true }
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript
          queries: security-extended
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3
        with: { upload: true }
      - name: Local security scan
        run: devbox run security
      - name: Dependency vulnerability scan (Trivy)
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          scan-ref: .
          format: sarif
          output: trivy-fs-results.sarif
          severity: CRITICAL,HIGH
          exit-code: "1"
      - name: Upload Trivy results
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy-fs-results.sarif
          category: trivy-dependencies

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: jetify-com/devbox-install-action@v0.4.0
        with: { enable-cache: true }
      - name: Lint
        run: devbox run lint
      - name: Test
        run: devbox run test
        env: { NODE_ENV: test }
      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [security, test]
    outputs:
      sha-tag: ${{ env.IMAGE_NAME }}:sha-${{ github.sha }}
    steps:
      - uses: actions/checkout@v4
      - uses: jetify-com/devbox-install-action@v0.4.0
        with: { enable-cache: true }
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        if: github.event_name != 'pull_request'
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-
            type=ref,event=branch
            type=ref,event=pr
      - name: Build (and push if not PR)
        uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - name: Container vulnerability scan (Trivy)
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.IMAGE_NAME }}:sha-${{ github.sha }}
          format: sarif
          output: trivy-image-results.sarif
          severity: CRITICAL,HIGH
          exit-code: "1"
      - name: Upload container scan results
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy-image-results.sarif
          category: trivy-container

  release:
    name: Release
    runs-on: ubuntu-latest
    needs: [security, test, build]
    if: startsWith(github.ref, 'refs/tags/v')
    permissions:
      contents: write
      packages: write
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: jetify-com/devbox-install-action@v0.4.0
        with: { enable-cache: true }
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Extract semver from tag
        id: version
        run: echo "version=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT
      - name: Build and push release image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.IMAGE_NAME }}:${{ steps.version.outputs.version }}
            ${{ env.IMAGE_NAME }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          body_path: .release-notes.md
          prerelease: ${{ contains(github.ref, '-alpha') || contains(github.ref, '-beta') || contains(github.ref, '-rc') }}
          token: ${{ secrets.GITHUB_TOKEN }}

  gitops-update:
    name: GitOps Update
    runs-on: ubuntu-latest
    needs: [release]
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - name: Check secrets configured
        id: check
        run: |
          if [ -z "${{ secrets.GITOPS_PAT }}" ] || [ -z "${{ secrets.GITOPS_REPO }}" ]; then
            echo "skip=true" >> $GITHUB_OUTPUT
          else
            echo "skip=false" >> $GITHUB_OUTPUT
          fi
      - uses: actions/checkout@v4
        if: steps.check.outputs.skip == 'false'
        with:
          repository: ${{ secrets.GITOPS_REPO }}
          token: ${{ secrets.GITOPS_PAT }}
          path: gitops
      - uses: jetify-com/devbox-install-action@v0.4.0
        if: steps.check.outputs.skip == 'false'
        with:
          enable-cache: true
          project-path: gitops
      - name: Update image tag
        if: steps.check.outputs.skip == 'false'
        run: |
          VERSION="${GITHUB_REF#refs/tags/v}"
          VALUES="gitops/apps/frontend/values.yaml"
          yq e -i ".image.tag = \"${VERSION}\"" "$VALUES"
      - uses: peter-evans/create-pull-request@v6
        if: steps.check.outputs.skip == 'false'
        with:
          token: ${{ secrets.GITOPS_PAT }}
          path: gitops
          commit-message: "chore(deps): bump e2e-frontend to ${{ github.ref_name }}"
          branch: "bump/e2e-frontend-${{ github.ref_name }}"
          title: "⬆️ Bump e2e-frontend to ${{ github.ref_name }}"
          delete-branch: true
```

## Branch Strategy

See ADR-0002. Key rules:

| Branch | Pattern | Merges into |
|--------|---------|------------|
| Integration | `main` | — |
| Task | `task/T-NNN-<slug>` | `main` via PR (squash) |
| Release | `release/v<semver>` | `main` via PR + tag |
| Hotfix | `hotfix/T-NNN-<slug>` | `main` via PR |

**Branch protection on `main`:** Require PR; require `ci/test` and `ci/security` to pass;
branches must be up-to-date.

## Security Gates

| Finding type | Severity | PR gate | Release gate |
|-------------|---------|---------|-------------|
| CodeQL SAST | CRITICAL/HIGH | ✅ Blocks | ✅ Blocks |
| npm dependency CVE | CRITICAL/HIGH | ✅ Blocks | ✅ Blocks |
| Secrets (gitleaks) | Any | ✅ Blocks | ✅ Blocks |
| Container CVE | CRITICAL/HIGH | — | ✅ Blocks release job |
| Trivy fs | CRITICAL/HIGH | ✅ Blocks | ✅ Blocks |

## Release Strategy

See ADR-0004. Summary:

- Conventional commits on `main` determine semver bump.
- Release skill runs after all waves complete: bumps `version` in `openspec/project.md`
  and `package.json`, updates `CHANGELOG.md`, creates `v<semver>` tag.
- Tag push triggers the `release` + `gitops-update` jobs.

## Required Secrets / Variables

| Name | Type | Purpose |
|------|------|---------|
| `GITHUB_TOKEN` | Auto | Push to ghcr.io, create releases |
| `GITOPS_PAT` | Secret | Push to ika100/e2e-gitops |
| `GITOPS_REPO` | Secret | `ika100/e2e-gitops` |
| `GITOPS_VALUES_PATH` | Variable | `apps/frontend/values.yaml` |

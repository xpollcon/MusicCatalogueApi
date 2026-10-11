# Deployment

Every merge to `main` runs `.github/workflows/deploy.yml`. It tests and builds the API, then
runs `sam deploy` against the `music-catalogue-api` stack in `ap-southeast-2`. Pull requests only
run the tests and build.

You can also start a deploy by hand from the repo's **Actions** tab ("Test and deploy" → "Run
workflow" on `main`).

## One-time setup

GitHub signs in to AWS with OpenID Connect, so no AWS keys are stored in GitHub.

1. **Create the deploy role** (with AWS credentials that can create IAM roles):

   ```sh
   aws cloudformation deploy \
     --region ap-southeast-2 \
     --stack-name music-catalogue-github-deploy \
     --template-file deploy/github-deploy-role.yaml \
     --capabilities CAPABILITY_IAM
   ```

   If your account already has a GitHub OIDC provider (`token.actions.githubusercontent.com`
   under IAM → Identity providers), add
   `--parameter-overrides ExistingOidcProviderArn=<its ARN>`. An account can only have one.

2. **Get the role ARN:**

   ```sh
   aws cloudformation describe-stacks \
     --region ap-southeast-2 \
     --stack-name music-catalogue-github-deploy \
     --query "Stacks[0].Outputs[0].OutputValue" --output text
   ```

3. **Give it to GitHub:** in the repo go to Settings → Secrets and variables → Actions →
   **Variables** → New repository variable, name `AWS_DEPLOY_ROLE_ARN`, value the ARN from step 2.

## Notes

- The role only trusts workflows running on `main` of this repo, and can only change
  resources whose names start with the stack name.
- The pipeline deploys with the template's default parameters. If you deployed locally with
  `--parameter-overrides` (e.g. `MusicBrainzContact`), the next pipeline deploy resets them to the
  defaults; change the default in `template.yaml` instead.
- The stack doesn't output the API key: the key CloudFormation created has expired and been
  replaced by hand, so reading it back failed every deploy. Manage keys in the AppSync console
  (Settings → API keys), and remember they expire after at most 365 days.
- If a deploy fails with `AccessDenied`, the error names the missing permission. Add it to
  `deploy/github-deploy-role.yaml` and redeploy that stack (step 1).

@echo off
echo Pushing deployment files to GitHub repository...

REM Add all new deployment files
git add COMPLETE_DEPLOYMENT_GUIDE.md
git add README-DEPLOYMENT.md
git add deploy-complete.sh
git add setup-env.sh

REM Check if there are changes to commit
git status

echo.
echo Files to be committed:
echo - COMPLETE_DEPLOYMENT_GUIDE.md (Comprehensive deployment guide)
echo - README-DEPLOYMENT.md (Quick EC2 deployment guide)
echo - deploy-complete.sh (Automated deployment script)
echo - setup-env.sh (Environment configuration script)
echo.

set /p confirm="Do you want to commit and push these files? (y/n): "
if /i "%confirm%"=="y" (
    echo Committing files...
    git commit -m "Add comprehensive deployment guides and automation scripts

- Add COMPLETE_DEPLOYMENT_GUIDE.md with detailed setup instructions
- Add README-DEPLOYMENT.md for quick EC2 deployment
- Add deploy-complete.sh for automated deployment
- Add setup-env.sh for interactive environment configuration
- Support for both resort booking system and AI chat app deployment"

    echo Pushing to GitHub...
    git push origin main

    echo.
    echo ✅ Successfully pushed deployment files to GitHub!
    echo.
    echo 📋 Next steps for EC2 deployment:
    echo 1. SSH into your EC2 instance
    echo 2. Run: git clone https://github.com/venkey3413/vizag-resort-booking.git
    echo 3. Run: cd vizag-resort-booking
    echo 4. Run: ./setup-env.sh (configure API keys)
    echo 5. Run: ./deploy-complete.sh (automated deployment)
    echo.
) else (
    echo Deployment cancelled.
)

pause
# 🚀 Production Deployment Guide
## Scopic Legal - Private Beta Program

**Latest Commit:** `d918e61` - fix: hide mode selector when only Auto is available  
**Date:** December 1, 2025

---

## ✅ Pre-Deployment Checklist

- [x] Database migration completed
- [x] Email templates updated in Supabase
- [x] All code committed and pushed to GitHub
- [x] Local testing completed
- [ ] Backend deployed to production
- [ ] Frontend deployed to production
- [ ] Production smoke test completed

---

## 🎯 Deployment Options

### Option A: Automatic Deployment (Recommended)

If you're using **Vercel**, **Netlify**, **Railway**, or similar platforms that auto-deploy from GitHub:

1. **Check Deployment Status**
   - Go to your hosting platform dashboard
   - Verify that the latest commits triggered deployments:
     - `fce1e9e` - Main implementation
     - `d918e61` - Mode selector fix

2. **Monitor Build Logs**
   - Backend: Check for any errors during build
   - Frontend: Verify Next.js build completes successfully

3. **Wait for Deployment**
   - Typically takes 2-5 minutes
   - You'll receive a notification when complete

---

### Option B: Manual Deployment

If you need to deploy manually:

#### Backend Deployment

```bash
# 1. SSH into your backend server
ssh user@your-backend-server.com

# 2. Navigate to project directory
cd /path/to/scopic-legal-backend

# 3. Pull latest code
git pull origin main

# 4. Install dependencies (if needed)
pip install -r requirements.txt

# 5. Restart the service
# For systemd:
sudo systemctl restart scopic-backend

# For PM2:
pm2 restart scopic-backend

# For Docker:
docker-compose down && docker-compose up -d
```

#### Frontend Deployment

```bash
# 1. SSH into your frontend server (or use your deployment tool)
ssh user@your-frontend-server.com

# 2. Navigate to project directory
cd /path/to/scopic-legal-frontend

# 3. Pull latest code
git pull origin main

# 4. Install dependencies
npm install

# 5. Build the application
npm run build

# 6. Restart the service
# For PM2:
pm2 restart scopic-frontend

# For systemd:
sudo systemctl restart scopic-frontend

# For Docker:
docker-compose down && docker-compose up -d
```

---

## 🔍 Verify Deployment

### 1. Check Backend Health

```bash
curl https://your-backend-url.com/health
# Should return: {"status":"ok"} or similar
```

Or visit in browser: `https://your-backend-url.com/docs` (FastAPI Swagger UI)

### 2. Check Frontend

Visit: `https://your-app-url.com`

**Expected:**
- ✅ Page loads without errors
- ✅ No console errors in browser DevTools
- ✅ All assets load (CSS, JS, images)

### 3. Check Legal Documents

Visit these URLs:
- `https://your-app-url.com/terms`
- `https://your-app-url.com/privacy`
- `https://your-app-url.com/acceptance`

**Expected:**
- ✅ All pages load
- ✅ Download buttons work
- ✅ DOCX files download correctly

---

## 🧪 Production Smoke Test (10 minutes)

### Test 1: Sign-Up Flow (5 min)

1. **Navigate to your production URL**
   ```
   https://your-app-url.com
   ```

2. **Start Sign-Up**
   - Click "Want to join our private beta? Apply here"
   - Verify form shows 5 fields:
     - ✅ Full Name
     - ✅ Company Name
     - ✅ Referral Source
     - ✅ Email
     - ✅ Password

3. **Submit Application**
   - Fill in all fields with test data
   - Click "Apply to Join"
   - ✅ Success message appears

4. **Check Email**
   - ✅ Email received from "Scopic" (not "Supabase Auth")
   - ✅ Subject: "Confirm your Email Address"
   - ✅ Body mentions "Private Beta Program"
   - ✅ Link points to production URL (NOT localhost)

5. **Confirm Email**
   - Click confirmation link
   - ✅ Redirects to production app
   - ✅ Terms modal appears

6. **Accept Terms**
   - ✅ Modal title: "Acceptance of Terms and Privacy Policy"
   - ✅ "Terms of Use" and "Privacy Policy" links work
   - Click "Accept & Continue"
   - ✅ Chat interface loads

---

### Test 2: UI Verification (2 min)

1. **Check Sidebar**
   - ✅ "Scopic Legal" title
   - ✅ "Private Beta Program" subtitle
   - ✅ "+ New Legal Query" button
   - ✅ Empty state: "No Legal Queries yet..."

2. **Check Profile Section**
   - ✅ "+ Upload Legal Docs" button
   - ✅ "for Private Beta Analysis" text below
   - ✅ User email displayed
   - ✅ NO "Role: client" text

3. **Check Chat Input**
   - ✅ Disclaimer text updated
   - ✅ NO "Mode" selector visible
   - ✅ NO microphone button
   - ✅ Only "+" and send button visible

---

### Test 3: File Upload (2 min)

1. **Upload Before First Message**
   - Click "+" button
   - Select a PDF file
   - ✅ Loading spinner appears
   - ✅ File attaches successfully

2. **Send Message**
   - Type: "Please summarize this document"
   - Click send
   - ✅ Message sends
   - ✅ AI responds with file content

---

### Test 4: Profile Library (1 min)

1. **Open Modal**
   - Click "+ Upload Legal Docs"
   - ✅ Modal opens with correct title

2. **Test Drag-and-Drop**
   - Drag a file over upload area
   - ✅ Blue highlight appears
   - Drop file
   - ✅ File uploads

3. **Test Actions**
   - ✅ "View" button opens file
   - ✅ "Delete" button removes file
   - ✅ "Book Check-In Meeting" opens Runway6 link

---

## 🚨 Common Production Issues

### Issue 1: 404 on Legal Pages

**Symptom:** `/terms`, `/privacy`, `/acceptance` return 404

**Fix:**
- Verify `frontend/public/legal/` folder was deployed
- Check if static files are being served
- Ensure Next.js build includes public folder

**Vercel/Netlify:** Should work automatically  
**Manual:** Ensure public folder is copied to deployment

---

### Issue 2: Email Links to Localhost

**Symptom:** Confirmation emails link to `http://localhost:3000`

**Fix:**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set "Site URL" to: `https://your-production-url.com`
3. Add to "Redirect URLs": `https://your-production-url.com/**`

---

### Issue 3: CORS Errors

**Symptom:** Frontend can't connect to backend, CORS errors in console

**Fix:**
1. Check backend `ALLOWED_ORIGINS` environment variable
2. Should include your production frontend URL
3. Example: `ALLOWED_ORIGINS=https://your-app-url.com`

---

### Issue 4: File Upload Fails

**Symptom:** Files don't upload in production

**Possible Causes:**
- Supabase Storage CORS not configured
- Wrong Supabase URL/keys in environment variables
- Storage bucket doesn't exist

**Fix:**
1. Verify environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Check Supabase Storage policies
3. Verify "uploads" bucket exists

---

### Issue 5: Database Connection Fails

**Symptom:** Backend can't connect to Supabase database

**Fix:**
1. Verify `SUPABASE_DB_URL` environment variable
2. Check database is accessible from production server
3. Verify connection string format:
   ```
   postgresql+asyncpg://postgres:password@host:5432/postgres
   ```

---

## 📊 Post-Deployment Monitoring

### First 24 Hours

**Check every 4 hours:**

1. **Error Logs**
   - Backend: Check for 500 errors, database issues
   - Frontend: Check browser console for JS errors

2. **Key Metrics**
   - Sign-up success rate (should be ~100%)
   - File upload success rate (should be >95%)
   - API response times (should be <2s)

3. **User Feedback**
   - Monitor for any reported issues
   - Check email confirmations are working
   - Verify file uploads are successful

---

## ✅ Success Criteria

Deployment is successful when:

- ✅ New users can sign up with all 5 fields
- ✅ Email confirmation works (production URL, not localhost)
- ✅ Terms modal shows with working links
- ✅ File upload works before first message
- ✅ Profile Library drag-and-drop works
- ✅ All legal pages load and downloads work
- ✅ Calendar link opens Runway6 scheduler
- ✅ Mode selector is hidden (only Auto available)
- ✅ No console errors on fresh page load
- ✅ User metadata saves to database correctly

---

## 🎉 Post-Deployment Actions

Once all tests pass:

### 1. Notify Stakeholders

```
Subject: Scopic Legal Private Beta - Now Live in Production

The Private Beta Program is now live at: https://your-app-url.com

Key Updates:
✅ New sign-up form with Full Name, Company, Referral Source
✅ Updated branding throughout the app
✅ File upload now works before first message
✅ Legal documents accessible at /terms, /privacy, /acceptance
✅ Profile Library with drag-and-drop and delete
✅ Calendar integration for check-in meetings

Please test the sign-up flow and provide feedback.

Meeting Scheduler: https://runway6.vc/meetings/abhanot/dpcheckin?uuid=d4556964-cc24-4a30-8c61-b0d456a87f30
```

### 2. Update Documentation

- [ ] Update README with production URL
- [ ] Document any production-specific configuration
- [ ] Update API documentation if needed

### 3. Monitor & Iterate

- [ ] Collect user feedback for 1 week
- [ ] Track feature adoption
- [ ] Note any UX improvements needed
- [ ] Schedule review meeting

---

## 🔗 Important URLs

**Production:**
- Frontend: `https://your-app-url.com`
- Backend: `https://your-backend-url.com`
- Backend Docs: `https://your-backend-url.com/docs`

**Legal Pages:**
- Terms: `https://your-app-url.com/terms`
- Privacy: `https://your-app-url.com/privacy`
- Acceptance: `https://your-app-url.com/acceptance`

**External:**
- GitHub: https://github.com/ezazahamad2003/founders-v3
- Supabase: https://supabase.com/dashboard
- Meeting Scheduler: https://runway6.vc/meetings/abhanot/dpcheckin?uuid=d4556964-cc24-4a30-8c61-b0d456a87f30

---

## 📞 Need Help?

If you encounter issues:

1. Check this guide's "Common Production Issues" section
2. Review `DEPLOYMENT_GUIDE.md` for detailed troubleshooting
3. Check deployment logs on your hosting platform
4. Verify all environment variables are set correctly

---

**Deployment Completed By:** _______________  
**Date:** _______________  
**Production URL:** _______________  
**Status:** [ ] Success / [ ] Issues Found

---

## 🎊 You're Live!

All stakeholder feedback has been implemented and deployed to production. The Scopic Legal Private Beta Program is now ready for users! 🚀

